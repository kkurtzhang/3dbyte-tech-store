"""Activate bounded manufacturer references using local agent source review, never native approval."""

import argparse
import json
import re
import sqlite3
from pathlib import Path
from local_store import ROOT, SCOPE, Store

SEED = Path(__file__).resolve().parent / "evaluation/catalogue-seed-v1.json"
ACTOR = "codex_local_catalogue_source_review"


def prepared_records(store, seed_path=SEED):
    seed_path = Path(seed_path).resolve()
    if not seed_path.is_relative_to(SEED.parent.resolve()):
        raise ValueError("Seed must be in the repository evaluation directory")
    seed = json.loads(seed_path.read_text())
    assert seed["environment"] == SCOPE and seed["retailer_own_brand_excluded"]
    assert not seed["live_offers"] and not seed["native_export"]
    manifest = json.loads(
        (ROOT / "reports" / seed["source_capture_manifest"]).read_text()
    )
    sources = {item["key"]: item for item in manifest if item.get("id")}
    for source in sources.values():
        store.source(source)
    old_products = [
        json.loads(row[0]) for row in store.db.execute("SELECT payload FROM products")
    ]
    records, guides, entities, duplicate_checks = [], [], [], []
    for entry in seed["entries"]:
        key = entry["reference_id"]
        assert key.startswith("catalogue_")
        assert entry["brand"] in {
            "Micro Swiss",
            "LDO",
            "Slice Engineering",
            "BuildTak",
            "Fiberlogy",
            "Magigoo",
        }
        related_children = {
            item["group_key"]
            for row in store.db.execute("SELECT payload FROM records WHERE active=1")
            if (item := json.loads(row[0])).get("generic_parent_reference_group") == key
        }
        # A separately reviewed related nozzle is not the hotend identity it fits.
        duplicates = [
            p["id"]
            for p in old_products
            if p["group_key"] != key
            and p["group_key"] not in related_children
            and any(
                re.search(pattern, p["title"], re.I) for pattern in entry["aliases"]
            )
        ]
        assert not duplicates, (key, duplicates)
        duplicate_checks.append(
            {"group_key": key, "existing_other_identity_matches": duplicates}
        )
        pid = "local_dev_product_" + key
        vid = "local_dev_variant_" + key
        product = {
            "id": pid,
            "group_key": key,
            "title": entry["title"],
            "environment": SCOPE,
            "kind": "manufacturer_knowledge_reference",
            "brand": entry["brand"],
            "staging_product_id": None,
            "price": None,
            "physical_stock": None,
            "checkout_enabled": False,
        }
        variant = {
            "id": vid,
            "product_id": pid,
            "group_key": key,
            "environment": SCOPE,
            "kind": "local_knowledge_reference_variant",
            "selected_supplier_variant": None,
            "staging_variant_id": None,
            "price": None,
            "physical_stock": None,
            "checkout_enabled": False,
        }
        entities.append({"product": product, "variant": variant})

        def claim(item, status):
            citations = []
            for proof in item.get("proofs", []):
                source = sources[proof["source_key"]]
                citation = {
                    "local_source_id": source["id"],
                    "quote": proof["quote"],
                    "source_url": source["source_url"],
                }
                if proof.get("json_pointer"):
                    citation["json_pointer"] = proof["json_pointer"]
                else:
                    text = Path(source["text_path"]).read_text()
                    start = text.index(proof["quote"])
                    citation.update(
                        start_char=start, end_char=start + len(proof["quote"])
                    )
                assert store.cite(citation), proof
                citations.append(citation)
            value = item.get("value")
            assert status != "unknown" or value is None
            return {
                "field": item["field"],
                "label": item["field"].replace("_", " "),
                "value": value,
                "text": value
                if value
                else "Unknown for this exact product/reference scope; retain null.",
                "status": status,
                "citations": citations,
                "query_pattern": item["query_pattern"],
                "keywords": entry["title"]
                + " "
                + entry["brand"]
                + " "
                + item["field"].replace("_", " "),
            }

        basis = {
            "kind": "agent_source_review_for_authorized_local_development",
            "reviewer_type": "codex_agent",
            "reviewer_actor": ACTOR,
            "user_factual_review_claimed": False,
            "parent_factual_review_pending": True,
            "native_reviewer_event": False,
            "verification": "Manufacturer/retailer scope reviewed; immutable raw/text SHA-256 and exact excerpts/JSON pointers verified; dated AUD observations never live offers.",
        }
        common = {
            "group_key": key,
            "environment": SCOPE,
            "local_record_schema_version": 2,
            "local_product_id": pid,
            "local_variant_id": vid,
            "staging_native_id": None,
            "staging_export_allowed": False,
            "native_approval": None,
            "source_scope": entry["source_scope"],
            "reference_aliases": entry["aliases"],
            **(
                {
                    "generic_parent_reference_group": entry[
                        "generic_parent_reference_group"
                    ]
                }
                if entry.get("generic_parent_reference_group")
                else {}
            ),
            "factual_decision_basis": basis,
            "explicit_unknowns": {x["field"]: None for x in entry["unknowns"]},
        }
        records.append(
            {
                **common,
                "id": "local_dev_document_" + key,
                "record_key": key + "_source",
                "kind": "source_document",
                "title": entry["title"] + " — scoped source reference",
                "claims": [claim(x, "supported") for x in entry["facts"]]
                + [claim(x, "unknown") for x in entry["unknowns"]],
            }
        )
        guides.append(
            {
                **common,
                "id": "local_dev_guide_" + key,
                "record_key": key + "_guide",
                "kind": "editorial_guide",
                "title": entry["title"] + " — selection guidance",
                "claims": [claim(x, "editorial_inference") for x in entry["guides"]],
            }
        )
    return records, guides, entities, duplicate_checks, manifest


def activate(name, seed_path=SEED):
    output = ROOT / "reports" / name
    if Path(name).name != name or not name.endswith(".json") or output.exists():
        raise ValueError("New JSON report basename required")
    store = Store()
    try:
        before = store.stats()
        previous = {
            r["record_key"]: r["revision"]
            for r in store.db.execute(
                "SELECT record_key,revision FROM records WHERE active=1"
            )
        }
        backup = ROOT / "exports" / (Path(name).stem + "-before.sqlite3")
        if backup.exists():
            raise FileExistsError("Preserve previous backup")
        target = sqlite3.connect(backup)
        try:
            store.db.backup(target)
        finally:
            target.close()
        records, guides, entities, duplicates, sources = prepared_records(
            store, seed_path
        )
        document_result = store.ingest(records, actor=ACTOR, local_references=entities)
        guide_result = store.ingest(guides, actor=ACTOR, local_references=entities)
        for key, revision in previous.items():
            assert (
                store.db.execute(
                    "SELECT revision FROM records WHERE record_key=?", (key,)
                ).fetchone()[0]
                == revision
            )
        report = {
            "environment": SCOPE,
            "before": before,
            "after": store.stats(),
            "documents": document_result,
            "guides": guide_result,
            "duplicate_checks": duplicates,
            "preserved_existing_revisions": len(previous),
            "backup": str(backup),
            "new_identity_count": document_result["created"],
            "source_versions": [
                {
                    k: s[k]
                    for k in (
                        "key",
                        "id",
                        "source_url",
                        "sha256",
                        "text_sha256",
                        "captured_at",
                    )
                }
                for s in sources
            ],
            "native_approvals": 0,
            "staging_writes": 0,
            "paid_calls": 0,
            "listeners_started": False,
            "user_factual_review_claimed": False,
            "local_actor": ACTOR,
            "record_ids": [r["id"] for r in records + guides],
        }
        with output.open("x") as f:
            f.write(json.dumps(report, indent=2) + "\n")
        print(
            json.dumps(
                {
                    k: report[k]
                    for k in (
                        "before",
                        "after",
                        "documents",
                        "guides",
                        "preserved_existing_revisions",
                        "new_identity_count",
                    )
                }
            )
        )
        return report
    finally:
        store.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    parser.add_argument("--seed", default=SEED.name)
    args = parser.parse_args()
    if Path(args.seed).name != args.seed:
        raise ValueError("Seed basename required")
    activate(args.report, SEED.parent / args.seed)
