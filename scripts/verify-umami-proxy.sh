#!/bin/bash
# Isolated proxy contract test. Never reloads or signals an existing service.
# Usage: bash verify-umami-proxy.sh [actual-umami-locations.conf]
# Override NGINX_BIN or PYTHON_BIN only to select existing local executables.
set -eu
umask 077
fragment=${1:-/srv/paytools/config/umami-locations.conf}
if [ "$#" -gt 1 ] || [ ! -r "$fragment" ]; then
    printf '%s\n' 'Readable deployed Umami location fragment required.' >&2
    exit 2
fi
nginx_bin=${NGINX_BIN:-/usr/sbin/nginx}
python_bin=${PYTHON_BIN:-/usr/bin/python3}
if [ ! -x "$nginx_bin" ] || [ ! -x "$python_bin" ]; then
    printf '%s\n' 'Existing Nginx and Python 3.6+ executables required.' >&2
    exit 2
fi
work_dir=$(mktemp -d /tmp/paytools-umami-proxy.XXXXXX)
run_pid=
cleanup() {
    if [ -n "$run_pid" ]; then
        kill -TERM "$run_pid" 2>/dev/null || true
        wait "$run_pid" 2>/dev/null || true
    fi
    case "$work_dir" in
        /tmp/paytools-umami-proxy.*) [ ! -d "$work_dir" ] || rm -rf -- "$work_dir" ;;
    esac
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
"$python_bin" - "$fragment" "$nginx_bin" "$work_dir" <<'PY' &
from __future__ import print_function
import hashlib
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
from pathlib import Path
import re
import signal
import socket
import subprocess
import sys
import threading
import time
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import build_opener, ProxyHandler, Request

fragment_path, nginx_bin, work_dir = sys.argv[1:]
work = Path(work_dir)
backend = None
backend_thread = None
nginx = None
checks = []
events = []
failures = []
proxy_port = None
original = b''
status = 'failed'
header_names = (
    'Cookie', 'Authorization', 'Referer', 'Forwarded', 'X-Forwarded-Host',
    'CF-Connecting-IP', 'True-Client-IP', 'Fastly-Client-IP',
    'X-NF-Client-Connection-IP', 'DO-Connecting-IP',
    'X-Vercel-Forwarded-For', 'X-Client-IP', 'Accept-Encoding',
)
ip_names = header_names[3:-1]
stage = 'initialization'


def check(condition, code):
    checks.append({'check': code, 'passed': bool(condition)})
    if not condition:
        failures.append(code)
        raise RuntimeError(code)


def stop(signum, frame):
    raise SystemExit(128 + signum)


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGHUP, stop)
signal.signal(signal.SIGINT, stop)


class Echo(BaseHTTPRequestHandler):
    # Echo only presence flags and trusted local addresses. Never persist or
    # return header values, query text, Authorization, cookies or request body.
    def log_message(self, format, *args):
        pass

    def reply(self):
        address = urlsplit(self.path)
        body_length = int(self.headers.get('Content-Length', '0'))
        if body_length:
            self.rfile.read(body_length)
        observed = {
            'method': self.command,
            'path': address.path if address.path in ('/script.js', '/api/send') else '[unapproved]',
            'queryPresent': bool(address.query),
            'bodyPresent': body_length > 0,
            'headerPresent': {name: bool(self.headers.get(name)) for name in header_names},
            'trustedForwardedFor': self.headers.get('X-Forwarded-For') == '127.0.0.1',
            'trustedRealIP': self.headers.get('X-Real-IP') == '127.0.0.1',
            'forwardedProtoIsHTTP': self.headers.get('X-Forwarded-Proto') == 'http',
        }
        events.append(observed)
        payload = json.dumps(observed).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Set-Cookie', 'controlled_upstream_cookie=CONTROLLED_TEST')
        self.send_header('Cache-Control', 'private, max-age=999')
        self.end_headers()
        self.wfile.write(payload)

    do_GET = reply
    do_POST = reply
    do_HEAD = reply
    do_OPTIONS = reply


try:
    original = Path(fragment_path).read_bytes()
    fragment = original.decode('utf-8-sig')
    # These checks keep the deployed fragment inside a single isolated server.
    # Do not import the main nginx.conf or any operational service directives.
    active = '\n'.join(line.split('#', 1)[0] for line in fragment.splitlines())
    check(not re.search(r'(?m)^\s*(?:include|listen|pid|load_module|error_log|user|daemon|master_process)\b', active), 'fragment_has_no_global_or_listener_directives')
    locations = re.findall(r'(?m)^\s*location\s+([^\{]+)\{', active)
    check([item.strip() for item in locations] == ['= /analytics/script.js', '= /analytics/api/send', '^~ /analytics/'], 'fragment_has_only_expected_locations')
    check(active.count('http://127.0.0.1:3001/') == 2 and len(re.findall(r'\bproxy_pass\b', active)) == 2, 'fragment_has_two_expected_local_upstreams')

    stage = 'start_echo'
    # Binding port zero atomically reserves a free loopback-only echo endpoint.
    backend = HTTPServer(('127.0.0.1', 0), Echo)
    echo_port = backend.server_address[1]
    backend_thread = threading.Thread(target=backend.serve_forever)
    backend_thread.daemon = True
    backend_thread.start()

    # Check candidate ports before starting our own Nginx. Never reuse a live
    # listener; if a race wins the port, startup below fails without any signal.
    stage = 'reserve_proxy_port'
    for candidate in range(18090, 18110):
        probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            probe.bind(('127.0.0.1', candidate))
            proxy_port = candidate
            break
        except OSError:
            pass
        finally:
            probe.close()
    check(proxy_port is not None, 'isolated_proxy_port_available')
    isolated = fragment.replace('http://127.0.0.1:3001/', 'http://127.0.0.1:{}/'.format(echo_port))
    (work / 'locations.conf').write_text(isolated, encoding='utf-8')
    config = '''worker_processes 1;
pid "{root}/nginx.pid";
error_log /dev/null crit;
events {{ worker_connections 32; }}
http {{
    access_log off;
    client_body_temp_path "{root}/client-body";
    proxy_temp_path "{root}/proxy-temp";
    server {{
        listen 127.0.0.1:{port};
        server_name proxy-validation.invalid;
        include "{root}/locations.conf";
        location / {{ return 404; }}
    }}
}}
'''.format(root=work_dir, port=proxy_port)
    config_path = work / 'nginx.conf'
    config_path.write_text(config, encoding='utf-8')
    command = [nginx_bin, '-p', work_dir + '/', '-c', str(config_path), '-g', 'daemon off; master_process off;']
    stage = 'start_isolated_nginx'
    tested = subprocess.run(command + ['-t'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
    check(tested.returncode == 0, 'isolated_nginx_config_valid')
    nginx = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    def owns_listener():
        # Prove the selected socket belongs to our foreground child before
        # sending HTTP, closing the bind-check/startup race with other services.
        try:
            addresses = {'socket:[{}]'.format(row.split()[9])
                         for row in Path('/proc/net/tcp').read_text().splitlines()[1:]
                         if row.split()[1] == '0100007F:{:04X}'.format(proxy_port)
                         and row.split()[3] == '0A'}
            return any(os.readlink(str(fd)) in addresses
                       for fd in Path('/proc/{}/fd'.format(nginx.pid)).iterdir())
        except OSError:
            return False

    ready = False
    for attempt in range(60):
        if nginx.poll() is not None:
            break
        if owns_listener():
            ready = True
            break
        time.sleep(0.05)
    check(ready, 'isolated_nginx_started')
    opener = build_opener(ProxyHandler({}))
    spoof = {
        'Cookie': 'controlled_browser_cookie=CONTROLLED_TEST',
        'Authorization': 'Bearer CONTROLLED_TEST',
        'Referer': 'https://referrer.invalid/private?CONTROLLED_TEST',
        'Forwarded': 'for=203.0.113.57;proto=https;host=spoof.invalid',
        'X-Forwarded-Host': 'spoof.invalid', 'Accept-Encoding': 'gzip',
        'X-Forwarded-For': '203.0.113.57', 'X-Real-IP': '203.0.113.57',
        'X-Forwarded-Proto': 'https', 'Host': 'proxy-validation.invalid',
        'Content-Type': 'application/json',
    }
    for name in ip_names:
        if name not in spoof:
            spoof[name] = '203.0.113.57'

    def request(method, path):
        req = Request('http://127.0.0.1:{}{}'.format(proxy_port, path),
                      data=b'{}' if method == 'POST' else None, headers=spoof, method=method)
        try:
            response = opener.open(req, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            return response.code, response.headers, response.read()

    for label, method, endpoint, upstream_path, cache in (
        ('script', 'GET', '/analytics/script.js', '/script.js', 'public, max-age=3600'),
        ('send', 'POST', '/analytics/api/send', '/api/send', 'no-store'),
    ):
        stage = 'success_' + label
        before = len(events)
        code, headers, raw = request(method, endpoint + '?controlled=CONTROLLED_TEST')
        check(code == 200, label + '_status_200')
        check(headers.get_all('Cache-Control') == [cache], label + '_cache_policy_replaces_upstream')
        check(not headers.get('Set-Cookie'), label + '_upstream_set_cookie_hidden')
        check(headers.get('Referrer-Policy') == 'no-referrer', label + '_referrer_policy')
        check(headers.get('X-Robots-Tag') == 'noindex, nofollow', label + '_noindex')
        echo = json.loads(raw.decode('utf-8'))
        check(len(events) == before + 1 and echo['method'] == method and echo['path'] == upstream_path, label + '_exact_upstream_route_and_method')
        check(not echo['queryPresent'], label + '_query_removed')
        check(not any(echo['headerPresent'][name] for name in ('Cookie', 'Authorization', 'Referer')), label + '_sensitive_headers_removed')
        if label == 'script':
            check(not echo['headerPresent']['Accept-Encoding'], 'script_accept_encoding_removed')
        else:
            check(not any(echo['headerPresent'][name] for name in ip_names), 'send_extra_ip_and_forwarding_headers_removed')
            check(echo['trustedForwardedFor'] and echo['trustedRealIP'], 'send_ip_headers_overwritten_with_loopback_client')
            check(echo['forwardedProtoIsHTTP'], 'send_forwarded_proto_overwritten')

    stage = 'methods'
    for endpoint, methods in (('/analytics/script.js', ('POST', 'HEAD', 'OPTIONS')), ('/analytics/api/send', ('GET', 'HEAD', 'OPTIONS'))):
        for method in methods:
            before = len(events)
            code, headers, raw = request(method, endpoint)
            label = ('script' if endpoint.endswith('script.js') else 'send') + '_' + method.lower()
            check(code == 405 and len(events) == before, label + '_405_without_upstream')
            if endpoint.endswith('/send'):
                check(headers.get('Cache-Control') == 'no-store', label + '_no_store')

    stage = 'private_routes'
    for index, endpoint in enumerate(('/analytics/', '/analytics/login', '/analytics/api/auth/login', '/analytics/api/websites', '/analytics/api/send/', '/analytics/script.js/', '/analytics/admin')):
        before = len(events)
        code, headers, raw = request('GET', endpoint)
        check(code == 404 and len(events) == before, 'private_or_nonexact_route_{}_404_without_upstream'.format(index + 1))
    check(len(events) == 2, 'only_two_expected_requests_reached_echo')
    status = 'passed'
except (Exception, SystemExit):
    failures.append('execution_failed_at_' + stage)
finally:
    # Popen refers only to the process we created. No nginx -s, pkill, PID-file
    # lookup, service manager, Docker command, or operational config is touched.
    if nginx is not None:
        try:
            if nginx.poll() is None:
                nginx.terminate()
                try:
                    nginx.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    nginx.kill()
                    nginx.wait(timeout=5)
        except Exception:
            failures.append('isolated_nginx_cleanup_failed')
    if backend is not None:
        backend.shutdown()
        backend.server_close()
    if backend_thread is not None:
        backend_thread.join(timeout=2)
    if failures:
        status = 'failed'
    result = {
        'schemaVersion': 1, 'traffic': 'controlled isolated proxy test; not real pageviews',
        'result': status, 'sourceSha256': hashlib.sha256(original).hexdigest(),
        'proxyAddress': '127.0.0.1', 'proxyPort': proxy_port,
        'existingServicesModified': False, 'upstreamEchoRequests': len(events),
        'checks': checks, 'upstreamObservations': events, 'failures': failures,
        'scope': 'Both routes: sensitive headers/query/response policy. Send route: trusted client IP overwrite and extra forwarding header removal. Script IP header policy is observed, not asserted.',
        'privacy': 'Only known paths, methods, header-presence and trusted-loopback booleans retained. No raw headers, queries, body values, credentials or cookies recorded.',
    }
    print('UMAMI_PROXY_TEST_BEGIN')
    print(json.dumps(result, sort_keys=True))
    print('UMAMI_PROXY_TEST_END')
sys.exit(0 if status == 'passed' else 1)
PY
run_pid=$!
exit_code=0
wait "$run_pid" || exit_code=$?
run_pid=
exit "$exit_code"
