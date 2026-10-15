import json
from pathlib import Path
import tempfile
import unittest
import zipfile

from e2e_report import build_report


class SafeReportTest(unittest.TestCase):
    def test_excludes_auth_data_from_html_and_trace(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            results = root / "test-results"
            results.mkdir()
            secret = "SENSITIVE_COOKIE_AND_KEY"
            report = {"suites": [{"specs": [{
                "file": "auth/login.spec.ts", "line": 3, "title": secret,
                "tests": [{"status": "unexpected", "results": [{"error": {"message": secret}}]}],
            }]}]}
            (results / "report.json").write_text(json.dumps(report), encoding="utf-8")
            with zipfile.ZipFile(results / "trace.zip", "w") as trace:
                trace.writestr("test.trace", "\n".join(json.dumps(event) for event in [
                    {"type": "context-options", "version": 8, "origin": "testRunner",
                     "options": {"storageState": {"cookies": [{"value": secret}]}},
                     "browserName": "chromium", "wallTime": 1},
                    {"type": "before", "callId": "call@1", "class": "Locator", "method": "fill",
                     "startTime": 1, "params": {"value": secret}, "title": secret},
                    {"type": "after", "callId": "call@1", "endTime": 2,
                     "error": {"message": secret}, "attachments": [{"body": secret}]},
                    {"type": "console", "text": secret},
                ]))
                trace.writestr("0-trace.network", secret)
                trace.writestr("resources/body", secret)
            output = root / "report"
            build_report(results, output)
            self.assertNotIn(secret, (output / "index.html").read_text(encoding="utf-8"))
            with zipfile.ZipFile(output / "trace-1.zip") as trace:
                self.assertEqual(trace.namelist(), ["test.trace"])
                events = trace.read("test.trace").decode()
                self.assertNotIn(secret, events)
                self.assertIn("Locator.fill", events)
                self.assertIn("Action failed", events)

    def test_produces_setup_failure_summary_without_a_raw_report(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "report"
            build_report(root / "missing", output)
            self.assertIn("Setup failed", (output / "index.html").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
