"""Run with python -m unittest discover -s tests -p test_pv_report.py."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

REPOSITORY = Path(__file__).resolve().parents[1]
SCRIPT = REPOSITORY / "scripts" / "pv-report.py"
spec = importlib.util.spec_from_file_location("pv_report", SCRIPT)
pv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pv)


class PageViewReportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.now = pv.timestamp("2026-10-27T12:00:00+08:00")

    def tearDown(self):
        self.temp.cleanup()

    def cli(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT)] + [str(arg) for arg in args],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding="utf-8",
                              env=dict(os.environ, PYTHONIOENCODING="utf-8"))

    def test_same_second_distinct_events_rotation_and_incremental_reads(self):
        log = self.root / "pageviews.log"
        line = "2026-10-27T10:00:00+08:00\t/\n"
        log.write_text(line * 2, encoding="utf-8")
        state = pv.aggregate(self.root, {}, self.now)
        self.assertEqual(state["counts"]["2026-10-27|/"], 2)
        state = pv.aggregate(self.root, json.loads(json.dumps(state)), self.now)
        self.assertEqual(state["counts"]["2026-10-27|/"], 2)
        log.rename(self.root / "pageviews.log-20261027")
        log.write_text(line, encoding="utf-8")
        state = pv.aggregate(self.root, state, self.now)
        self.assertEqual(state["counts"]["2026-10-27|/"], 3)
        # Duplicate aliases of the same inode must not count again.
        os.link(str(log), str(self.root / "pageviews.log-alias"))
        state = pv.aggregate(self.root, state, self.now)
        self.assertEqual(state["counts"]["2026-10-27|/"], 3)

    def test_checkpoint_survives_file_temporarily_absent_during_rotation(self):
        log = self.root / "pageviews.log"
        log.write_text("2026-10-27T10:00:00+08:00\t/\n", encoding="utf-8")
        state = pv.aggregate(self.root, {}, self.now)
        hidden = self.root / "rotation-pending"
        log.rename(hidden)
        state = pv.aggregate(self.root, state, self.now)
        hidden.rename(self.root / "pageviews.log-20261027")
        state = pv.aggregate(self.root, state, self.now)
        self.assertEqual(state["counts"]["2026-10-27|/"], 1)

    def test_rotation_between_is_file_and_open_keeps_checkpoint_for_retry(self):
        log = self.root / "pageviews.log"
        line = "2026-10-27T10:00:00+08:00\t/\n"
        log.write_text(line, encoding="utf-8")
        state = pv.aggregate(self.root, {}, self.now)
        with log.open("a", encoding="utf-8") as output:
            output.write(line)
        checkpoints = json.loads(json.dumps(state["files"]))
        original_open = Path.open

        def rotate_on_open(path, *args, **kwargs):
            if path == log:
                path.rename(self.root / "pageviews.log-20261027")
            return original_open(path, *args, **kwargs)

        with mock.patch.object(Path, "open", rotate_on_open):
            state = pv.aggregate(self.root, state, self.now)
        self.assertEqual(state["counts"]["2026-10-27|/"], 1)
        self.assertEqual(state["files"], checkpoints)
        state = pv.aggregate(self.root, state, self.now)
        self.assertEqual(state["counts"]["2026-10-27|/"], 2)

    def test_cli_requires_collection_start_before_changing_state(self):
        state = self.root / "state.json"
        original = '{"counts": {"2026-10-26|/": 3}}'
        state.write_text(original, encoding="utf-8")
        (self.root / "pageviews.log").write_text("2026-10-27T10:00:00+08:00\t/\n", encoding="utf-8")
        result = self.cli("--log-dir", self.root, "--state", state,
                          "--collection-start-file", self.root / "missing-start",
                          "--output-json", self.root / "report.json", "--now", "2026-10-27T12:00:00+08:00")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("required collection-start file missing", result.stderr)
        self.assertEqual(state.read_text(encoding="utf-8"), original)
        self.assertFalse(Path(str(state) + ".lock").exists())
        self.assertFalse((self.root / "report.json").exists())

    def test_cli_rejects_public_report_and_state_destinations(self):
        fixture = self.root / "input.json"
        fixture.write_text(json.dumps(pv.report({}, None, self.now, "preview")), encoding="utf-8")
        for directory in ("public", "out"):
            for option in ("--output-json", "--output-html", "--state"):
                with self.subTest(directory=directory, option=option):
                    destination = REPOSITORY / directory / (self.root.name + ".json")
                    result = self.cli("--input-json", fixture, option, destination)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("must remain outside public/ and out/", result.stderr)
                    self.assertFalse(destination.exists())

    def test_cli_rejects_symlinks_resolving_into_public_directories(self):
        fixture = self.root / "input.json"
        fixture.write_text(json.dumps(pv.report({}, None, self.now, "preview")), encoding="utf-8")
        alias = self.root / "public-alias"
        try:
            alias.symlink_to(REPOSITORY / "public", target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("Directory symlinks unavailable on this platform")
        for option in ("--output-json", "--output-html", "--state"):
            with self.subTest(option=option):
                result = self.cli("--input-json", fixture, option, alias / "pv-regression.json")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("must remain outside public/ and out/", result.stderr)
                self.assertFalse((alias / "pv-regression.json").exists())

    @unittest.skipUnless(sys.platform.startswith("linux"), "Linux CLI aggregation requires fcntl")
    def test_cli_persisted_history_survives_expired_logs_without_replay(self):
        logs = self.root / "logs"
        logs.mkdir()
        state = self.root / "state.json"
        start = self.root / "collection-start"
        start.write_text("2026-10-26T09:00:00+08:00", encoding="utf-8")
        log = logs / "pageviews.log"
        log.write_text("2026-10-26T10:00:00+08:00\t/\n", encoding="utf-8")
        args = ("--log-dir", logs, "--state", state, "--collection-start-file", start,
                "--now", "2026-10-27T12:00:00+08:00", "--stdout-json")
        first = self.cli(*args)
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(json.loads(first.stdout)["windows"]["last7"]["pv"], 1)
        log.unlink()  # Processed raw file has expired; only the persisted state retains it.
        log.write_text("2026-10-27T10:00:00+08:00\t/privacy/\n", encoding="utf-8")
        second = self.cli(*args)
        self.assertEqual(second.returncode, 0, second.stderr)
        data = json.loads(second.stdout)
        self.assertEqual(data["windows"]["last7"]["pv"], 2)
        self.assertEqual(data["windows"]["today"]["pv"], 1)
        self.assertEqual(data["windows"]["last7"]["pages"]["/"], 1)
        third = self.cli(*args)
        self.assertEqual(third.returncode, 0, third.stderr)
        self.assertEqual(json.loads(third.stdout)["windows"]["last7"]["pv"], 2)

    def test_next_second_event_remains_unread_until_the_next_scan(self):
        log = self.root / "pageviews.log"
        log.write_text("2026-10-27T10:00:01+08:00\t/\n", encoding="utf-8")
        state = pv.aggregate(self.root, {}, pv.timestamp("2026-10-27T10:00:00+08:00"))
        self.assertEqual(state["counts"], {})
        self.assertEqual(state["rejected_lines"], 0)
        self.assertEqual(next(iter(state["files"].values()))["offset"], 0)
        state = pv.aggregate(self.root, state, pv.timestamp("2026-10-27T10:00:02+08:00"))
        self.assertEqual(state["counts"]["2026-10-27|/"], 1)
        state = pv.aggregate(self.root, state, pv.timestamp("2026-10-27T10:00:02+08:00"))
        self.assertEqual(state["counts"]["2026-10-27|/"], 1)

    def test_partial_append_and_invalid_paths_are_not_counted(self):
        log = self.root / "pageviews.log"
        line = "2026-10-27T10:00:00+08:00\t/privacy/"
        log.write_text(line, encoding="utf-8")
        state = pv.aggregate(self.root, {}, self.now)
        self.assertEqual(state["counts"], {})
        with log.open("a", encoding="utf-8") as output:
            output.write("\n2026-10-27T10:00:00+08:00\t/?salary=99999\nHEAD / HTTP/1.1\n")
        state = pv.aggregate(self.root, state, self.now)
        self.assertEqual(state["counts"], {"2026-10-27|/privacy/": 1})
        self.assertEqual(state["rejected_lines"], 2)
        self.assertNotIn("99999", json.dumps(state))

    def test_shanghai_date_boundary_and_partial_coverage(self):
        log = self.root / "pageviews.log"
        log.write_text("2026-10-26T15:59:59+00:00\t/\n2026-10-26T16:00:00+00:00\t/\n", encoding="utf-8")
        state = pv.aggregate(self.root, {}, self.now)
        data = pv.report(state, "2026-10-26T23:50:00+08:00", self.now, "preview")
        self.assertEqual(data["windows"]["today"]["pv"], 1)
        self.assertEqual(data["windows"]["last7"]["pv"], 2)
        self.assertTrue(data["daily"][-2]["partial"])
        self.assertTrue(data["daily"][-1]["partial"])
        self.assertFalse(data["daily"][-3]["covered"])
        rendered = pv.render_html(data)
        self.assertIn("预览环境", rendered)
        self.assertIn("Asia/Shanghai", rendered)
        self.assertIn("不完整日", rendered)

    def test_no_data_is_explicit_and_output_is_private(self):
        data = pv.report({}, None, self.now, "preview")
        self.assertTrue(data["no_data"])
        self.assertIsNone(data["collection_start"])
        self.assertIn("暂无采集数据", pv.render_html(data))
        output = self.root / "report.json"
        pv.private_write(output, json.dumps(data))
        self.assertTrue(output.is_file())
        if os.name != "nt":
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main()
