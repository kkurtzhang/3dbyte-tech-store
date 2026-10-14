"""Check offline route source evidence plus independently expected conversation focus."""

import argparse
import json
import re
from pathlib import Path

from evaluate_customer_coverage import run
from local_store import ROOT


def verify(fixture, streams, prefix):
    if not re.fullmatch(r"[a-z0-9-]+", prefix):
        raise ValueError("Use a new report basename prefix")
    evidence_status = run(prefix + "-evidence.json", streams, fixture)
    expected = {case["id"]: case for case in json.loads(fixture.read_text())["cases"]}
    captures = json.loads(streams.read_text())["captures"]
    if len(captures) != len(expected) or {row["id"] for row in captures} != set(
        expected
    ):
        raise ValueError("Route captures must cover every frozen case exactly once")
    results = []
    for capture in captures:
        events = [
            json.loads(line[6:])
            for line in capture["stream"].splitlines()
            if line.startswith("data: ") and line[6:] != "[DONE]"
        ]
        context = next(
            event["data"]
            for event in events
            if event["type"] in ("data-local-knowledge", "data-local-resource-links")
        )
        case = expected[capture["id"]]
        focus = context.get("conversation_focus", {})
        matched = not case.get("expected_focus") or (
            focus.get("mode") == case["expected_focus"]
            and focus.get("group_key") == case["expected_group"]
            and focus.get("supplier_variant_selected") is False
        )
        results.append({"id": case["id"], "passed": matched, "focus": focus})
    report = {
        "passed": sum(row["passed"] for row in results),
        "total": len(results),
        "cases": results,
        "model_generation": False,
        "transport": "actual local chat handler and adapter; offline Python subprocess",
    }
    with (ROOT / "reports" / (prefix + "-identities.json")).open("x") as output:
        output.write(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"identity_passed": report["passed"], "total": report["total"]}))
    return evidence_status or int(report["passed"] != report["total"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", required=True, type=Path)
    parser.add_argument("--streams", required=True, type=Path)
    parser.add_argument("--report-prefix", required=True)
    args = parser.parse_args()
    raise SystemExit(verify(args.fixture, args.streams, args.report_prefix))


if __name__ == "__main__":
    main()
