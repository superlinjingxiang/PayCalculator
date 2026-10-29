"""Exercise the real preview Nginx producer on an isolated localhost port.

Linux requires an installed nginx binary; Windows explicitly skips this suite.
Only the production template's runtime paths, listen address/port and user are
adapted. No system service or production configuration is touched.
"""
from collections import Counter
from datetime import datetime, timezone
import http.client
import json
import os
from pathlib import Path
import re
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import unittest

REPOSITORY = Path(__file__).resolve().parents[1]
SCRIPT = REPOSITORY / "scripts" / "pv-report.py"


@unittest.skipUnless(sys.platform.startswith("linux"), "Real Nginx PV integration runs only on Linux")
class PageViewNginxTests(unittest.TestCase):
    def setUp(self):
        import pwd
        self.nginx = shutil.which("nginx")
        if not self.nginx and Path("/usr/sbin/nginx").is_file():
            self.nginx = "/usr/sbin/nginx"
        self.assertIsNotNone(self.nginx, "Install nginx before running Linux test:pv")
        self.temp = tempfile.TemporaryDirectory(prefix="paytools-pv-nginx-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.logs = self.root / "logs"
        self.logs.mkdir()
        self.log = self.logs / "pageviews.log"
        self.pid = self.root / "nginx.pid"
        self.start = self.root / "collection-start"
        self.start.write_text(datetime.now(timezone.utc).replace(microsecond=0).isoformat(), encoding="utf-8")
        self.state = self.root / "state.json"
        self.public = self.root / "site"
        (self.public / "_next" / "static").mkdir(parents=True)
        (self.public / "index.html").write_text("<h1>isolated fixture</h1>", encoding="utf-8")
        (self.public / "404.html").write_text("not found", encoding="utf-8")
        (self.public / "_next" / "static" / "fixture.js").write_text("void 0;", encoding="utf-8")
        with socket.socket() as reservation:
            reservation.bind(("127.0.0.1", 0))
            self.port = reservation.getsockname()[1]
        source = (REPOSITORY / "deploy" / "nginx-preview.conf").read_text(encoding="utf-8")
        replacements = {
            "user nginx;": "user {};".format(pwd.getpwuid(os.geteuid()).pw_name),
            "/run/paytools-nginx.pid": str(self.pid),
            "/var/log/paytools/error.log": str(self.root / "error.log"),
            "/var/log/paytools/pv/pageviews.log": str(self.log),
            "/srv/paytools/current": str(self.public),
            "listen 80;": "listen 127.0.0.1:{};".format(self.port),
        }
        for original, replacement in replacements.items():
            self.assertIn(original, source)
            source = source.replace(original, replacement)
        self.config = self.root / "nginx.conf"
        self.config.write_text(source, encoding="utf-8")
        check = subprocess.run([self.nginx, "-t", "-c", str(self.config), "-p", str(self.root)],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
        self.assertEqual(check.returncode, 0, check.stderr)
        self.process = subprocess.Popen([self.nginx, "-c", str(self.config), "-p", str(self.root), "-g", "daemon off;"],
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.addCleanup(self.stop_nginx)
        self.wait_until(self.ready, "isolated nginx did not start")

    def stop_nginx(self):
        if self.process.poll() is None:
            self.process.send_signal(signal.SIGQUIT)
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
        self.process.communicate()

    def wait_until(self, condition, message):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if condition():
                return
            time.sleep(0.02)
        self.fail(message)

    def ready(self):
        if self.process.poll() is not None:
            self.fail("nginx exited: " + self.process.stderr.read().decode("utf-8", errors="replace"))
        try:
            return self.request("GET", "/")[0] == 200
        except OSError:
            return False

    def request(self, method, path, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        try:
            connection.request(method, path, headers=headers or {})
            response = connection.getresponse()
            response.read()
            return response.status, dict(response.getheaders())
        finally:
            connection.close()

    def raw_lines(self):
        return self.log.read_text(encoding="utf-8").splitlines() if self.log.exists() else []

    def get_report(self):
        result = subprocess.run([sys.executable, str(SCRIPT), "--log-dir", str(self.logs),
                                 "--state", str(self.state), "--collection-start-file", str(self.start), "--stdout-json"],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding="utf-8",
                                env=dict(os.environ, PYTHONIOENCODING="utf-8"))
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_homepage_disables_referrer_header(self):
        status, headers = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertEqual(headers.get("Referrer-Policy"), "no-referrer")

    def test_real_producer_filters_identifiers_and_survives_rotation_reopen(self):
        endpoints = {
            "home": "/", "calculator": "/salary-calculator/", "shanghai": "/shanghai-salary-calculator/",
            "methodology": "/methodology/", "policies": "/policy-sources/", "privacy": "/privacy/", "about": "/about/",
        }
        expected = Counter(endpoints.values())
        for endpoint in endpoints:
            status, headers = self.request("GET", "/__pv/" + endpoint)
            self.assertEqual(status, 204)
            self.assertEqual(headers.get("Cache-Control"), "no-store")
            self.assertEqual(headers.get("X-Robots-Tag"), "noindex, nofollow")
        status, _ = self.request("GET", "/__pv/home?salary=SALARY_SENTINEL&person=QUERY_SENTINEL", {
            "User-Agent": "UA_SENTINEL", "Referer": "https://ref.invalid/REFERRER_SENTINEL",
            "Cookie": "visitor=COOKIE_SENTINEL", "Authorization": "Bearer AUTH_SENTINEL",
            "X-Forwarded-For": "203.0.113.42",
        })
        self.assertEqual(status, 204)
        expected["/"] += 1
        for method, path, expected_status in (
                ("HEAD", "/__pv/home", 405), ("POST", "/__pv/home", 405),
                ("GET", "/__pv/unknown", 404), ("GET", "/__pv/home/", 404),
                ("GET", "/_next/static/fixture.js", 200), ("GET", "/", 200), ("GET", "/missing", 404)):
            self.assertEqual(self.request(method, path)[0], expected_status)
        self.wait_until(lambda: len(self.raw_lines()) == sum(expected.values()), "PV log did not flush successful GETs")
        lines = self.raw_lines()
        recorded = Counter()
        for line in lines:
            match = re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}\t(/\S*)", line)
            self.assertIsNotNone(match, "PV log must contain only timestamp and canonical page: " + line)
            recorded[match.group(1)] += 1
        self.assertEqual(recorded, expected)
        raw = "\n".join(lines)
        for identifier in ("SENTINEL", "203.0.113.42", "127.0.0.1", "?", "salary=", "GET", "HEAD", "POST"):
            self.assertNotIn(identifier, raw)
        first_report = self.get_report()
        self.assertEqual(first_report["windows"]["last30"]["pv"], sum(expected.values()))
        rotated = self.logs / "pageviews.log-rotated"
        self.log.rename(rotated)
        os.kill(int(self.pid.read_text(encoding="utf-8").strip()), signal.SIGUSR1)
        self.wait_until(lambda: self.log.exists(), "nginx did not reopen the rotated log")
        # Wait for worker log descriptors to reopen after the master creates the file.
        time.sleep(0.1)
        self.assertEqual(self.request("GET", "/__pv/privacy")[0], 204)
        expected["/privacy/"] += 1
        self.wait_until(lambda: len(self.raw_lines()) == 1, "new request was not written to the reopened file")
        self.assertEqual(len(rotated.read_text(encoding="utf-8").splitlines()), len(lines))
        data = self.get_report()
        self.assertEqual(data["windows"]["last30"]["pv"], sum(expected.values()))
        self.assertEqual(data["windows"]["last30"]["pages"], dict(expected))
        self.assertEqual(self.get_report()["windows"]["last30"]["pv"], sum(expected.values()))


if __name__ == "__main__":
    unittest.main()
