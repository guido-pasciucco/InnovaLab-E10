"""Publish only an allowlisted summary and action timelines, never raw auth traces."""
import html
import json
import math
from pathlib import Path
import re
import zipfile


def identifier(value):
    return value if isinstance(value, str) and re.fullmatch(r"[\w.@-]{1,120}", value) else "redacted"


def safe_event(event):
    kind = event.get("type")
    if kind not in ("context-options", "before", "after"):
        return None
    safe = {"type": kind}
    for key in ("version", "wallTime", "monotonicTime", "startTime", "endTime"):
        value = event.get(key)
        if isinstance(value, (int, float)) and math.isfinite(value):
            safe[key] = value
    if kind == "context-options":
        safe.update(browserName="chromium", platform="linux", sdkLanguage="javascript",
                    origin="testRunner" if event.get("origin") == "testRunner" else "library",
                    options={}, contextId=identifier(event.get("contextId")))
    else:
        for key in ("callId", "parentId", "stepId", "class", "method"):
            if key in event:
                safe[key] = identifier(event[key])
        if kind == "before":
            safe["apiName"] = safe.get("class", "Action") + "." + safe.get("method", "step")
            safe["title"] = safe["apiName"]
            safe["params"] = {}
        elif event.get("error"):
            safe["error"] = {"message": "Action failed; sensitive details omitted."}
    return safe


def sanitize_trace(source, target):
    with zipfile.ZipFile(source) as raw, zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as clean:
        # Drop network, DOM, screenshots, sources, attachments, stdout and cookies.
        # Fail closed on malformed data; the workflow will not upload partial output.
        for name in raw.namelist():
            if not re.fullmatch(r"[^/\\]+\.trace", name):
                continue
            events = []
            for line in raw.read(name).decode("utf-8").splitlines():
                event = safe_event(json.loads(line))
                if event is not None:
                    events.append(json.dumps(event))
            clean.writestr(name, "\n".join(events) + "\n")


def cases(suites):
    for suite in suites:
        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                yield spec, test
        yield from cases(suite.get("suites", []))


def build_report(results=Path("test-results"), output=Path("playwright-report")):
    if output.exists():
        raise RuntimeError("Refusing to mix safe evidence with an existing report directory.")
    output.mkdir()
    report_path = results / "report.json"
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {}
    rows = []
    for index, (spec, test) in enumerate(cases(report.get("suites", [])), 1):
        # Identify cases by source file/line; omit dynamic titles, error values and logs.
        filename = Path(spec.get("file", "unknown")).name
        if not re.fullmatch(r"[\w.-]+", filename):
            filename = "redacted"
        line = spec.get("line", 0)
        line = line if isinstance(line, int) else 0
        status = test.get("status", "unknown")
        if status not in ("expected", "unexpected", "flaky", "skipped"):
            status = "unknown"
        rows.append(f"<li>Case {index}: {html.escape(filename)}:{line} — {status}</li>")
    links = []
    for index, source in enumerate(sorted(results.rglob("trace.zip")), 1):
        name = f"trace-{index}.zip"
        sanitize_trace(source, output / name)
        links.append(f'<li><a href="{name}">{name}</a></li>')
    summary = "<ul>" + "".join(rows) + "</ul>" if rows else "<p>Setup failed before test results were available. See the job log.</p>"
    document = (
        '<!doctype html><html lang="en"><meta charset="utf-8"><title>E2E failure evidence</title>'
        "<h1>E2E failure evidence</h1>"
        "<p>The Actions check and exit code are authoritative. "
        "This report omits credentials, cookies, network payloads, DOM, screenshots, logs and error values. "
        "Traces retain action names, timing and failure markers only; open them with Playwright Trace Viewer.</p>"
        + summary + "<h2>Sanitized traces</h2><ul>" + "".join(links) + "</ul></html>"
    )
    (output / "index.html").write_text(document, encoding="utf-8")


if __name__ == "__main__":
    build_report()
