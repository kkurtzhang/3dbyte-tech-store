"""Validate actual offline route streams against persisted source facts; no listening service."""

import argparse
import hashlib
import json
from pathlib import Path
from local_store import ROOT, Store

FIXTURE = Path(__file__).resolve().parent / "evaluation/customer-coverage-cases-v1.json"


def run(name, route_results, fixture=FIXTURE):
    if (
        Path(name).name != name
        or not name.endswith(".json")
        or (ROOT / "reports" / name).exists()
    ):
        raise ValueError("New JSON report basename required")
    store = Store()
    rows = {row["id"]: json.loads(row["payload"]) for row in store.rows()}
    results = []
    try:
        for case in json.loads(fixture.read_text())["cases"]:
            captures = json.loads(Path(route_results).read_text())["captures"]
            captured = next(item for item in captures if item["id"] == case["id"])
            assert captured["questions"] == case["questions"]
            if captured.get("status", 200) != 200:
                results.append(
                    {
                        "id": case["id"],
                        "questions": case["questions"],
                        "status": "route_unavailable",
                        "checks": {"route_status": False},
                        "passed": False,
                        "response_status": captured["status"],
                    }
                )
                continue
            raw = captured["stream"].encode()
            assert len(raw) <= 400000
            parts = [
                json.loads(line[6:])
                for line in raw.decode().splitlines()
                if line.startswith("data: ") and line[6:] != "[DONE]"
            ]
            ctx = next(
                p["data"]
                for p in parts
                if p["type"] in ("data-local-knowledge", "data-local-resource-links")
            )
            text = "".join(p["delta"] for p in parts if p["type"] == "text-delta")
            links = [p for p in parts if p["type"] == "source-url"]
            ids = ctx.get("context_assembly", {}).get("selected_claim_ids", [])
            selected = [rows[key] for key in ids if key in rows]
            proof = []
            for claim in ctx.get("context_pack", []):
                persisted = rows[claim["claim_id"]]
                assert (
                    persisted["record_revision"] == claim["record_revision"]
                    and persisted["text"] == claim["statement"]
                    and persisted["source_scope"] == claim["source_scope"]
                )
                for citation in claim["citations"]:
                    checked = store.cite(citation)
                    assert (
                        checked
                        and checked["source_sha256"] == citation["source_sha256"]
                    )
                    proof.append(checked)
            checks = {
                "status": ctx["status"] == case["status"],
                "expected_rendered_fields": all(
                    any(
                        c["record_key"] == key and c["field"] == field for c in selected
                    )
                    for key, field in case.get("required", [])
                ),
                "unknown_fields": all(
                    field in ctx.get("unknown_fields", [])
                    for field in case.get("unknown_fields", [])
                ),
                "source_links": all(
                    any(
                        c["local_source_id"] == l["sourceId"]
                        and c["source_url"] == l["url"]
                        for c in proof
                    )
                    for l in links
                )
                if ctx.get("context_pack")
                else True,
                "local_scope": ctx["environment"] == "local_development"
                and ctx["staging_native_eligible"] is False,
            }
            if case.get("required_reason"):
                index = json.loads(
                    (
                        Path(__file__).resolve().parents[2]
                        / "apps/storefront-v3/src/app/api/ai-shopping-assistant/three-d-sets-source-index.json"
                    ).read_text()
                )
                checks["resource_reason"] = ctx.get("reason") == case["required_reason"]
                checks["official_links_only"] = (
                    ctx.get("source_usage") == index["source_usage"]
                    and not ids
                    and not ctx.get("context_pack")
                )
                allowed_urls = {index["catalogue_url"], index["faq"]["url"]}

                def collect_urls(value):
                    if isinstance(value, dict):
                        for key, item in value.items():
                            if key in (
                                "url",
                                "product_url",
                                "guide_url",
                            ) and isinstance(item, str):
                                allowed_urls.add(item)
                            else:
                                collect_urls(item)
                    elif isinstance(value, list):
                        for item in value:
                            collect_urls(item)
                    elif isinstance(value, str) and value.startswith("https://"):
                        allowed_urls.add(value)

                collect_urls(index)
                checks["official_link_registry"] = bool(links) and all(
                    link["url"] in allowed_urls for link in links
                )
            if case["status"] == "unknown":
                checks["no_positive_claim_rendered"] = not ids and not links
            results.append(
                {
                    "id": case["id"],
                    "questions": case["questions"],
                    "status": ctx["status"],
                    "reason": ctx.get("reason"),
                    "selected": [[x["record_key"], x["field"]] for x in selected],
                    "text": text,
                    "source_links": links,
                    "checks": checks,
                    "passed": all(checks.values()),
                }
            )
        report = {
            "measurement": "Deterministic customer coverage; no model calls.",
            "fixture_sha256": hashlib.sha256(fixture.read_bytes()).hexdigest(),
            "cases": results,
            "passed": sum(x["passed"] for x in results),
            "total": len(results),
            "model_generation": False,
        }
        with (ROOT / "reports" / name).open("x") as f:
            f.write(json.dumps(report, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "passed": report["passed"],
                    "total": len(results),
                    "failures": [x["id"] for x in results if not x["passed"]],
                    "report": str(ROOT / "reports" / name),
                }
            )
        )
        return 0 if report["passed"] == len(results) else 1
    finally:
        store.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--report", required=True)
    p.add_argument("--route-results", required=True)
    p.add_argument("--fixture", default=FIXTURE.name)
    args = p.parse_args()
    if Path(args.fixture).name != args.fixture:
        raise ValueError("Fixture basename required")
    raise SystemExit(
        run(args.report, args.route_results, FIXTURE.parent / args.fixture)
    )
