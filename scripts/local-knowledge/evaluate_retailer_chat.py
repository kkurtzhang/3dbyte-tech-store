"""Check actual local chatbot behavior and persisted source evidence for retailer references."""

import argparse
import hashlib
import json
import urllib.request
from pathlib import Path

from local_store import ROOT, Store

CASES = Path(__file__).resolve().parent / "evaluation/retailer-chat-cases-v1.json"


def run(report_name):
    output = ROOT / "reports" / report_name
    if (
        Path(report_name).name != report_name
        or not report_name.endswith(".json")
        or output.exists()
    ):
        raise ValueError("Choose a new JSON report basename")
    fixture = json.loads(CASES.read_text())
    store = Store()
    rows = {row["id"]: json.loads(row["payload"]) for row in store.rows()}
    results = []
    try:
        for case in fixture["cases"]:
            request = urllib.request.Request(
                "http://127.0.0.1:3005/api/ai-shopping-assistant",
                data=json.dumps(
                    {
                        "messages": [
                            {"role": "user", "parts": [{"type": "text", "text": q}]}
                            for q in case["questions"]
                        ]
                    }
                ).encode(),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                assert (
                    response.headers["x-3db-ai-model"] == "local-deterministic-context"
                )
                data = response.read(400001)
                assert len(data) <= 400000
            chunks = [
                json.loads(line[6:])
                for line in data.decode().splitlines()
                if line.startswith("data: ") and line[6:] != "[DONE]"
            ]
            context = next(
                x["data"]
                for x in chunks
                if x["type"] in ["data-local-knowledge", "data-local-resource-links"]
            )
            text = "".join(x["delta"] for x in chunks if x["type"] == "text-delta")
            sources = [x for x in chunks if x["type"] == "source-url"]
            selected = context.get("context_assembly", {}).get("selected_claim_ids", [])
            fields = [rows[key]["field"] for key in selected if key in rows]
            checks = {
                "status": context["status"] == case["expected_status"],
                "required_fields": all(
                    field in fields for field in case.get("required_fields", [])
                ),
                "unknown_fields": all(
                    field in context.get("unknown_fields", [])
                    for field in case.get("unknown_fields", [])
                ),
                "local_environment": context["environment"] == "local_development"
                and context["staging_native_eligible"] is False,
            }
            verified = []
            for claim in context.get("context_pack", []):
                persisted = rows[claim["claim_id"]]
                assert (
                    persisted["record_revision"] == claim["record_revision"]
                    and persisted["text"] == claim["statement"]
                )
                assert persisted["source_scope"] == claim["source_scope"]
                for citation in claim["citations"]:
                    proof = store.cite(citation)
                    assert proof and proof["source_sha256"] == citation["source_sha256"]
                    verified.append(proof)
            if selected:
                checks["retailer_scope_rendered"] = (
                    "DREMC" in text and "reference" in text.lower()
                )
                checks["genuine_local_agent_basis"] = all(
                    rows[key]["editorial_basis"]["kind"]
                    == "agent_source_review_for_authorized_local_development"
                    and rows[key]["editorial_basis"]["user_factual_review_claimed"]
                    is False
                    for key in selected
                )
                checks["citations_rendered"] = bool(sources) and all(
                    any(
                        x["local_source_id"] == source["sourceId"]
                        and x["source_url"] == source["url"]
                        for x in verified
                    )
                    for source in sources
                )
            if context["status"] == "unknown":
                checks["no_positive_claim_rendered"] = not selected and not sources
            results.append(
                {
                    "id": case["id"],
                    "questions": case["questions"],
                    "status": context["status"],
                    "reason": context.get("reason"),
                    "text": text,
                    "selected_fields": fields,
                    "source_links": sources,
                    "checks": checks,
                    "passed": all(checks.values()),
                }
            )
        report = {
            "fixture_sha256": hashlib.sha256(CASES.read_bytes()).hexdigest(),
            "measurement": fixture["measurement"],
            "model_generation": False,
            "paid_calls": 0,
            "cases": results,
            "passed": sum(x["passed"] for x in results),
            "total": len(results),
        }
        with output.open("x") as file:
            file.write(json.dumps(report, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "report": str(output),
                    "passed": report["passed"],
                    "total": len(results),
                    "failures": [x["id"] for x in results if not x["passed"]],
                }
            )
        )
        return 0 if report["passed"] == len(results) else 1
    finally:
        store.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    raise SystemExit(run(parser.parse_args().report))
