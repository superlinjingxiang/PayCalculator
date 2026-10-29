#!/usr/bin/env bash
# Execute only the real installer's read-only preflight, with fixture paths and
# mock ip/docker/ss. The real installation/secrets body is never copied or run.
# Usage: bash tests/ops/verify-umami-install-preflight.sh [install-umami.sh]
set -euo pipefail
umask 077
source_file=${1:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)/deploy/install-umami.sh}
if [ "$#" -gt 1 ] || [ ! -r "$source_file" ]; then
    printf '%s\n' 'Readable installer source required.' >&2
    exit 2
fi
python3 - "$source_file" <<'PY'
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

raw = Path(sys.argv[1]).read_bytes()
source = raw.decode('utf-8')
boundary = 'install -d -m 0700 "$root" "$root/backups"'
if source.count(boundary) != 1:
    raise RuntimeError('Expected one exact installation-body boundary')
prefix = source.split(boundary, 1)[0]
# Validate the only embedded Python body before executing a truncated prefix.
route_code = """import ipaddress,json,subprocess
target=ipaddress.ip_network('172.19.0.0/16')
routes=json.loads(subprocess.check_output(['ip','-j','-4','route','show']).decode())
for route in routes:
    destination=route.get('dst','default')
    if destination=='default': continue
    if target.overlaps(ipaddress.ip_network(destination,strict=False)):
        raise RuntimeError('Analytics subnet overlaps an existing host route; inspect before deployment')"""
opener = "python3 - <<'PY'\n"
if prefix.count(opener) != 1 or prefix.split(opener, 1)[1].split('\nPY\n', 1)[0] != route_code:
    raise RuntimeError('Preflight Python body must be exactly the read-only route check')
for forbidden in ('secrets.token', 'with open(', 'stop_failed_install', 'systemctl ', 'install -d', 'docker run', 'docker exec', 'docker volume create', 'docker network create'):
    if forbidden in prefix:
        raise RuntimeError('Write/secrets body detected in preflight')
if 'test ! -e "$root/secrets.json"' not in prefix:
    raise RuntimeError('Expected read-only secret-file existence guard')
for probe in ('if docker volume inspect ', 'if docker network inspect ', 'if docker container inspect '):
    if probe not in prefix:
        raise RuntimeError('Expected explicit inspect rejection branch')

results = []
os.umask(0o077)
with tempfile.TemporaryDirectory(prefix='paytools-install-preflight-') as temp:
    fixture = Path(temp).resolve()
    mock_bin = fixture / 'mock-bin'
    mock_bin.mkdir(mode=0o700)
    mock = '''#!/usr/bin/env python3
import json,os,pathlib,sys
name=pathlib.Path(sys.argv[0]).name
args=sys.argv[1:]
case=os.environ['MOCK_INSPECT_CASE']
if name=='ip' and args==['-j','-4','route','show']:
    print('[]'); sys.exit(0)
if name=='ss' and args==['-Hltn','sport = :3001']:
    sys.exit(0)
if name=='docker':
    if len(args)>=3 and args[:2]==['image','inspect']:
        print(json.dumps([args[-1]]) if '--format' in args else '{}'); sys.exit(0)
    expected={('volume','inspect','paytools-umami-db-data'):'volume',
              ('network','inspect','paytools-analytics'):'network',
              ('container','inspect','paytools-umami'):'container_app',
              ('container','inspect','paytools-umami-db'):'container_db'}
    if tuple(args) in expected:
        sys.exit(0 if case==expected[tuple(args)] else 1)
pathlib.Path(os.environ['MOCK_UNEXPECTED']).write_text('unexpected mock invocation')
sys.exit(97)
'''
    for name in ('ip', 'docker', 'ss'):
        path = mock_bin / name
        path.write_text(mock, encoding='utf-8')
        path.chmod(0o700)
    cases = ('clear', 'database_env', 'app_env', 'volume', 'network', 'container_app', 'container_db', 'concurrent_lock')
    for case in cases:
        area = fixture / case
        deploy = area / 'deploy'
        scripts = area / 'scripts'
        root = area / 'analytics'
        for path in (deploy, scripts, root, area / 'etc-cron', area / 'etc-systemd'):
            path.mkdir(parents=True, mode=0o700)
        for name in ('paytools-umami.socket', 'paytools-umami.service', 'paytools-umami-backup.cron'):
            (deploy / name).write_text('controlled nonempty unit/cron fixture\n')
        for name in ('backup-umami.sh', 'verify-umami-restore.sh'):
            (scripts / name).write_text('#!/bin/sh\nexit 0\n')
        proxyd = area / 'systemd-socket-proxyd'
        proxyd.write_text('#!/bin/sh\nexit 0\n')
        proxyd.chmod(0o700)
        lock = area / 'install.lock'
        marker = area / 'danger-marker'
        replacements = {
            '/var/lock/paytools-umami-install.lock': str(lock),
            'root=/srv/paytools/analytics': 'root=' + str(root),
            '/etc/cron.d/paytools-umami-backup': str(area / 'etc-cron' / 'paytools-umami-backup'),
            '/usr/lib/systemd/systemd-socket-proxyd': str(proxyd),
            '/etc/systemd/system/paytools-umami.socket': str(area / 'etc-systemd' / 'paytools-umami.socket'),
            '/etc/systemd/system/paytools-umami.service': str(area / 'etc-systemd' / 'paytools-umami.service'),
        }
        copied = prefix
        for old, new in replacements.items():
            if copied.count(old) != 1:
                raise RuntimeError('Exact preflight path replacement count changed')
            copied = copied.replace(old, new, 1)
        restored = copied
        for old, new in reversed(list(replacements.items())):
            restored = restored.replace(new, old, 1)
        if restored != prefix or re.search(r'/(?:srv|etc|var/lock|usr/lib)/', copied):
            raise RuntimeError('Preflight must execute exclusively with fixture runtime paths')
        # This is the only permitted replacement for the discarded install body.
        copied += '\n: > "{}"\n'.format(marker)
        child = deploy / 'install-umami.sh'
        child.write_text(copied, encoding='utf-8')
        if case in ('database_env', 'app_env'):
            (root / ('database.env' if case == 'database_env' else 'app.env')).write_text('controlled residual fixture\n')
        env = dict(os.environ, PATH=str(mock_bin) + os.pathsep + os.environ['PATH'],
                   MOCK_INSPECT_CASE=case, MOCK_UNEXPECTED=str(area / 'unexpected-mock'))
        with lock.open('a') as held:
            if case == 'concurrent_lock':
                fcntl.flock(held, fcntl.LOCK_EX | fcntl.LOCK_NB)
            run = subprocess.run(['bash', str(child)], env=env, cwd=str(area),
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
            if case == 'concurrent_lock':
                fcntl.flock(held, fcntl.LOCK_UN)
        passed = ((run.returncode == 0 and marker.is_file()) if case == 'clear'
                  else (run.returncode != 0 and not marker.exists()))
        passed = passed and not (area / 'unexpected-mock').exists()
        results.append({'case': case, 'passed': passed, 'markerReached': marker.exists()})
        if not passed:
            break
report = {'schemaVersion': 1, 'result': 'passed' if len(results) == 8 and all(row['passed'] for row in results) else 'failed',
          'sourceSha256': hashlib.sha256(raw).hexdigest(), 'preflightSha256': hashlib.sha256(prefix.encode()).hexdigest(),
          'cases': results, 'installBodyExecuted': False, 'realDockerInvoked': False,
          'runtimePaths': 'private temporary fixture only; no production secret paths retained'}
print(json.dumps(report, sort_keys=True))
sys.exit(0 if report['result'] == 'passed' else 1)
PY
