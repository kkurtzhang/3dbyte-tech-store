"""Verify and ingest local agent-reviewed retailer references; no user/native approval claimed."""

import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

from local_store import ROOT, SCOPE, Store, clock
from prepare_kit_reference_plan import build_plan
from verify_retailer_kit_evidence import REVIEW

ACTOR = "codex_local_retailer_reference_source_review"


def prepared_records(store, plan):
    source_info = json.loads(REVIEW.read_text())["sources"][0]
    source = {
        "id": "local_source_retailer_dremc_" + source_info["raw_sha256"][:12],
        "source_url": source_info["source_url"],
        "sha256": source_info["raw_sha256"],
        "text_sha256": source_info["text_sha256"],
        "raw_path": str(ROOT / source_info["raw_path"]),
        "text_path": str(ROOT / source_info["text_path"]),
        "captured_at": source_info["checked_at"],
        "raw_capture_available": True,
        "capture_version_immutable": True,
        "environment": SCOPE,
    }
    store.source(source)
    serialized = Path(source["text_path"]).read_text()
    raw = json.loads(Path(source["raw_path"]).read_text())
    assert (
        hashlib.sha256(Path(source["raw_path"]).read_bytes()).hexdigest()
        == source["sha256"]
    )
    entities, records = [], []
    for entry in plan["entries"]:
        identity = entry["reference_identity"]
        sku = identity["source_sku"]
        group = entry["reference_key"]
        pid = "local_dev_product_" + group
        vid = "local_dev_variant_" + group
        title = "DREMC retailer reference " + sku + " — " + identity["variant_title"]
        product = {
            "id": pid,
            "group_key": group,
            "title": title,
            "environment": SCOPE,
            "kind": "external_retailer_knowledge_reference",
            "source_identity": identity,
            "staging_product_id": None,
            "price": None,
            "physical_stock": None,
            "checkout_enabled": False,
        }
        variant = {
            "id": vid,
            "product_id": pid,
            "group_key": group,
            "environment": SCOPE,
            "kind": "local_knowledge_reference_variant",
            "meaning": "Actual local SQLite reference grouping, not a selected physical supplier package or Medusa variant.",
            "external_source_variant_id": identity["source_variant_id"],
            "selected_supplier_variant": None,
            "staging_variant_id": None,
            "price": None,
            "physical_stock": None,
            "checkout_enabled": False,
        }
        entities.append({"product": product, "variant": variant})
        scope = (
            "Captured DREMC external retailer reference "
            + sku
            + " ("
            + identity["variant_title"]
            + "), checked "
            + source["captured_at"][:10]
            + ". Shared listing notes are third-party observations; they do not verify a 3D Byte Tech kit, complete contents, model release, live price or inventory."
        )
        proofs = {
            item["field"]: item for item in entry["source_sidecar"]["field_evidence"]
        }
        claims = []
        for fact in entry["native_record_template"]["knowledge_content"]["facts"]:
            citations = []
            if fact["value"] is not None:
                quote = fact["evidence_excerpt"]
                proof = proofs[fact["field"]]
                assert (
                    hashlib.sha256(quote.encode()).hexdigest()
                    == proof["excerpt_sha256"]
                )
                citation = {
                    "local_source_id": source["id"],
                    "quote": quote,
                    "source_url": source["source_url"],
                }
                if proof["json_pointer"] != "/description":
                    obj = raw
                    for key in proof["json_pointer"].strip("/").split("/"):
                        obj = obj[int(key)] if isinstance(obj, list) else obj[key]
                    assert str(obj) == quote
                    citation["json_pointer"] = proof["json_pointer"]
                else:
                    start = serialized.index(quote)
                    citation.update(
                        start_char=start,
                        end_char=start + len(quote),
                        offset_basis="archived_serialized_retailer_json_description",
                        shared_listing_note=True,
                    )
                assert store.cite(citation)
                citations = [citation]
            statement = (
                (fact["label"] + ": " + fact["value"] + ".")
                if fact["value"] is not None
                else "Unknown for this exact retailer reference scope; retain null."
            )
            claims.append(
                {
                    "field": fact["field"],
                    "label": fact["label"],
                    "value": fact["value"],
                    "text": statement,
                    "status": "supported" if fact["value"] is not None else "unknown",
                    "citations": citations,
                    "keywords": "DREMC external retailer reference "
                    + sku
                    + " "
                    + fact["field"].replace("_", " "),
                }
            )
        basis = {
            "kind": "agent_source_review_for_authorized_local_development",
            "reviewer_type": "codex_agent",
            "reviewer_actor": ACTOR,
            "user_factual_review_claimed": False,
            "parent_factual_review_pending": True,
            "native_reviewer_event": False,
            "verification": "Raw/text SHA-256, exact JSON pointers and serialized shared-note character excerpts.",
        }
        record = {
            "id": "local_dev_document_" + group,
            "record_key": group,
            "kind": "source_document",
            "group_key": group,
            "title": title,
            "environment": SCOPE,
            "local_record_schema_version": 2,
            "local_product_id": pid,
            "local_variant_id": vid,
            "staging_native_id": None,
            "staging_export_allowed": False,
            "native_approval": None,
            "source_scope": scope,
            "factual_decision_basis": basis,
            "explicit_unknowns": {
                f["field"]: None for f in claims if f["status"] == "unknown"
            },
            "claims": claims,
        }
        records.append(record)
    assert sum(c["status"] == "supported" for r in records for c in r["claims"]) == 21
    assert sum(c["status"] == "unknown" for r in records for c in r["claims"]) == 33
    return records, entities


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    if Path(args.report).name != args.report or not args.report.endswith(".json"):
        raise ValueError("A new JSON report basename is required")
    output = ROOT / "reports" / args.report
    if output.exists():
        raise FileExistsError("Preserve prior review report")
    plan = build_plan(json.loads(REVIEW.read_text()))
    store = Store()
    try:
        before = store.stats()
        existing = {
            r["record_key"]: r["revision"]
            for r in store.db.execute(
                "SELECT record_key,revision FROM records WHERE active=1"
            )
        }
        backup = ROOT / "exports" / (Path(args.report).stem + "-before.sqlite3")
        if backup.exists():
            raise FileExistsError("Preserve earlier backup")
        target = sqlite3.connect(backup)
        try:
            store.db.backup(target)
        finally:
            target.close()
        records, entities = prepared_records(store, plan)
        result = store.ingest(records, actor=ACTOR, local_references=entities)
        for key, revision in existing.items():
            assert (
                store.db.execute(
                    "SELECT revision FROM records WHERE record_key=?", (key,)
                ).fetchone()[0]
                == revision
            )
        after = store.stats()
        assert all(
            store.cite(c)
            for r in records
            for claim in r["claims"]
            for c in claim["citations"]
        )
        assert (
            store.db.execute(
                "SELECT count(*) FROM records WHERE json_extract(payload,'$.native_approval') IS NOT NULL"
            ).fetchone()[0]
            == 0
        )
        report = {
            "checked_at": clock(),
            "environment": SCOPE,
            "reviewer_type": "codex_agent",
            "reviewer_actor": ACTOR,
            "mechanism": "Store.ingest writes accepted_for_local_development editorial decisions in the dedicated local SQLite database.",
            "supported_facts_verified": 21,
            "unknown_fields_preserved": 33,
            "user_factual_review_claimed": False,
            "parent_review_pending": True,
            "native_approvals_created": 0,
            "staging_changes": 0,
            "existing_record_revisions_preserved": True,
            "before_database_backup": str(backup),
            "before": before,
            "after": after,
            "ingest": result,
            "records": records,
        }
        with output.open("x") as file:
            file.write(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
        print(
            json.dumps(
                {
                    "ingest": result,
                    "stats": after,
                    "supported_verified": 21,
                    "unknowns": 33,
                    "reviewer_type": "codex_agent",
                    "native_changes": 0,
                    "report": str(output),
                }
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    main()
