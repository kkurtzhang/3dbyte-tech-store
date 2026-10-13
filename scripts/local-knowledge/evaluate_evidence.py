"""Grade frozen evidence through the real local project route; never call a model."""

import argparse
import datetime
import hashlib
import json
import urllib.request
from pathlib import Path

from local_store import ROOT, Store

FIXTURE = Path(__file__).resolve().parent / "evaluation/heldout-v1.json"


def sha(value):
    return hashlib.sha256(value).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--report", required=True, help="New report basename in the SSD workspace"
    )
    args = parser.parse_args()
    if Path(args.report).name != args.report or not args.report.endswith(".json"):
        raise ValueError("A JSON report basename is required")
    output = ROOT / "reports" / args.report
    if output.exists():
        raise FileExistsError("Preserve prior evaluation; choose a new report name")
    fixture_hash = sha(FIXTURE.read_bytes())
    expected_hash = FIXTURE.with_suffix(".sha256").read_text().split()[0]
    if fixture_hash != expected_hash:
        raise ValueError("Frozen fixture changed")
    fixture = json.loads(FIXTURE.read_text())
    store = Store()
    rows = {row["id"]: row for row in store.rows()}
    lost = {x["local_source_id"] for x in fixture["historical_unavailable_versions"]}
    results = []
    try:
        for case in fixture["cases"]:
            checks = []

            def check(name, value):
                checks.append({"check": name, "passed": bool(value)})

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
            try:
                with urllib.request.urlopen(request, timeout=45) as response:
                    body = response.read(400001)
                    check("bounded_response", len(body) <= 400000)
                    check(
                        "deterministic_model_header",
                        response.headers.get("x-3db-ai-model")
                        == "local-deterministic-context",
                    )
                chunks = [
                    json.loads(line[6:])
                    for line in body.decode().splitlines()
                    if line.startswith("data: ") and line[6:] != "[DONE]"
                ]
                context = next(
                    x["data"] for x in chunks if x["type"] == "data-local-knowledge"
                )
                answer = "".join(
                    x["delta"] for x in chunks if x["type"] == "text-delta"
                )
                links = [x for x in chunks if x["type"] == "source-url"]
                check(
                    "local_scope",
                    context["environment"] == "local_development"
                    and context["staging_native_eligible"] is False,
                )
                check(
                    "no_model_generation",
                    context["context_assembly"]["model_generation"] is False
                    and context.get("model_calls", 0) == 0,
                )
                check("expected_status", context["status"] == case["expected_status"])
                ids = context["context_assembly"]["selected_claim_ids"]
                selected = [x for x in context["context_pack"] if x["claim_id"] in ids]
                check("selected_claims_exist", len(selected) == len(ids))
                for claim in context["context_pack"]:
                    row = rows[claim["claim_id"]]
                    persisted = json.loads(row["payload"])
                    check(
                        "claim_revision_and_statement:" + claim["claim_id"],
                        claim["record_revision"] == row["revision"]
                        and claim["statement"] == persisted["text"],
                    )
                    check(
                        "source_scope:" + claim["claim_id"],
                        claim["source_scope"] == persisted["source_scope"],
                    )
                    if claim["status"] == "unknown":
                        check(
                            "null_unknown:" + claim["claim_id"],
                            claim["value"] is None and not claim["citations"],
                        )
                    for citation in claim["citations"]:
                        proof = store.cite(citation)
                        check(
                            "citation_bytes:" + citation["local_source_id"],
                            proof
                            and proof["source_sha256"] == citation["source_sha256"]
                            and citation["local_source_id"] not in lost,
                        )
                for claim in selected:
                    check(
                        "selected_statement_rendered:" + claim["claim_id"],
                        claim["statement"] in answer,
                    )
                for expected in case["required_rendered_evidence"]:
                    claim = next(
                        (x for x in selected if x["claim_id"] == expected["claim_id"]),
                        None,
                    )
                    check(
                        "expected_claim_selected:" + expected["field"],
                        claim is not None,
                    )
                    if claim:
                        check(
                            "pinned_expected_statement:" + expected["field"],
                            claim["record_revision"] == expected["record_revision"]
                            and sha(claim["statement"].encode())
                            == expected["statement_sha256"],
                        )
                        for evidence in expected["citations"]:
                            citation = next(
                                (
                                    x
                                    for x in claim["citations"]
                                    if x["local_source_id"]
                                    == evidence["local_source_id"]
                                ),
                                None,
                            )
                            check(
                                "pinned_source_version:" + evidence["local_source_id"],
                                citation
                                and citation["source_sha256"]
                                == evidence["source_sha256"]
                                and citation["source_url"] == evidence["source_url"]
                                and sha(
                                    (
                                        citation.get("quote")
                                        or citation.get("evidence_excerpt")
                                    ).encode()
                                )
                                == evidence["excerpt_sha256"]
                                and citation.get("json_pointer")
                                == evidence["json_pointer"]
                                and citation.get("start_char") == evidence["start_char"]
                                and citation.get("end_char") == evidence["end_char"],
                            )
                for field in case["required_unknown_fields"]:
                    check(
                        "required_unknown:" + field,
                        field in context.get("unknown_fields", []),
                    )
                if context["status"] == "unknown":
                    check("no_rendered_positive_evidence", not selected and not links)
                proof = [
                    citation for claim in selected for citation in claim["citations"]
                ] + context.get("rating_citations", [])
                for citation in context.get("rating_citations", []):
                    actual = store.cite(citation)
                    check(
                        "rating_citation_bytes",
                        actual and actual["source_sha256"] == citation["source_sha256"],
                    )
                for link in links:
                    check(
                        "source_link_matches_rendered_evidence:" + link["sourceId"],
                        any(
                            x["local_source_id"] == link["sourceId"]
                            and x["source_url"] == link["url"]
                            for x in proof
                        ),
                    )
                if case["id"] == "H03":
                    check(
                        "replacement_entity_focus",
                        context["conversation_focus"]["subjects"]
                        == ["Revo brass nozzle"],
                    )
                results.append(
                    {
                        "id": case["id"],
                        "questions": case["questions"],
                        "status": context["status"],
                        "reason": context.get("reason"),
                        "answer": answer,
                        "selected_claim_ids": ids,
                        "checks": checks,
                        "passed": all(x["passed"] for x in checks),
                    }
                )
            except Exception as error:
                results.append(
                    {
                        "id": case["id"],
                        "passed": False,
                        "error_type": type(error).__name__,
                        "error": str(error)[:300],
                        "checks": checks,
                    }
                )
        negative = []
        for version in fixture["historical_unavailable_versions"]:
            # Old source IDs must fail even though the normalized technical text survived.
            candidate = {
                "local_source_id": version["local_source_id"],
                "quote": "not a reconstructed capture",
                "start_char": 0,
                "end_char": 27,
            }
            negative.append(
                {
                    "local_source_id": version["local_source_id"],
                    "source_sha256": version["source_sha256"],
                    "passed": store.cite(candidate) is None,
                }
            )
        text_citation = next(
            c
            for row in rows.values()
            for c in json.loads(row["payload"])["citations"]
            if c.get("start_char") is not None
        )
        pointer_citation = next(
            c
            for row in rows.values()
            for c in json.loads(row["payload"])["citations"]
            if c.get("json_pointer")
        )
        for label, candidate in [
            ("bad_character_excerpt", {**text_citation, "quote": "invalid excerpt"}),
            ("bad_json_pointer_value", {**pointer_citation, "quote": "invalid value"}),
        ]:
            negative.append({"case": label, "passed": store.cite(candidate) is None})
        report = {
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "fixture_sha256": fixture_hash,
            "environment": "local_development",
            "model_generation": False,
            "paid_calls": 0,
            "measurement": "Deterministic retrieval, rendering and source-version validity; no LLM answer-quality metric.",
            "cases": results,
            "passed_cases": sum(x["passed"] for x in results),
            "total_cases": len(results),
            "citation_negative_checks": negative,
            "all_negative_checks_passed": all(x["passed"] for x in negative),
            "all_passed": all(x["passed"] for x in results + negative),
        }
        with output.open("x") as stream:
            stream.write(json.dumps(report, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "report": str(output),
                    "fixture_sha256": fixture_hash,
                    "passed_cases": report["passed_cases"],
                    "total_cases": len(results),
                    "negative_checks": len(negative),
                    "all_negative_checks_passed": report["all_negative_checks_passed"],
                    "failures": [
                        {
                            "id": x["id"],
                            "checks": [
                                v["check"] for v in x["checks"] if not v["passed"]
                            ],
                            "error": x.get("error"),
                        }
                        for x in results
                        if not x["passed"]
                    ],
                }
            )
        )
        return 0 if report["all_passed"] else 1
    finally:
        store.close()


if __name__ == "__main__":
    raise SystemExit(main())
