"""Run fixed new-catalogue questions against persisted retrieval without listeners/models."""

import argparse
import hashlib
import json
from pathlib import Path
from local_store import ROOT, Store
from retrieval import Retriever

FIXTURE = Path(__file__).resolve().parent / "evaluation/catalogue-cases-v1.json"


def run(name):
    target = ROOT / "reports" / name
    if Path(name).name != name or not name.endswith(".json") or target.exists():
        raise ValueError("A new JSON report basename is required")
    store = Store()
    results = []
    try:
        retriever = Retriever(store)
        for case in json.loads(FIXTURE.read_text())["cases"]:
            reply = retriever.answer(case["question"])
            claims = reply.get("context_pack", [])
            checks = {
                "status": reply["status"] == case["status"],
                "product_scope": reply.get("group_key") == case["group"],
                "local_boundary": reply["environment"] == "local_development"
                and not reply["staging_native_eligible"]
                and reply["model_calls"] == 0,
            }
            if case["status"] == "unknown":
                checks["stored_unknown"] = case["field"] in reply.get(
                    "unknown_fields", []
                )
                checks["no_positive_context"] = not claims
            else:
                checks["requested_field"] = any(
                    claim.get("field") == case["field"]
                    and claim.get("record_key") == case["record_key"]
                    for claim in claims
                )
                checks["fresh_byte_verified_citations"] = bool(claims) and all(
                    claim["citations"]
                    and all(store.cite(c) for c in claim["citations"])
                    for claim in claims
                )
            results.append(
                {
                    "case": case,
                    "checks": checks,
                    "passed": all(checks.values()),
                    "reply": reply,
                }
            )
        report = {
            "measurement": "Deterministic persisted retrieval, offline, no listening service or generation model",
            "fixture_sha256": hashlib.sha256(FIXTURE.read_bytes()).hexdigest(),
            "passed": sum(x["passed"] for x in results),
            "total": len(results),
            "results": results,
        }
        with target.open("x") as f:
            f.write(json.dumps(report, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "passed": report["passed"],
                    "total": report["total"],
                    "failures": [x["case"]["id"] for x in results if not x["passed"]],
                    "report": str(target),
                }
            )
        )
        return 0 if report["passed"] == report["total"] else 1
    finally:
        store.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    raise SystemExit(run(parser.parse_args().report))
