"""Versioned, deduplicated local catalogue batches; no native identities or live offers."""

import argparse
import copy
import json
import sqlite3
from pathlib import Path
from local_store import ROOT, SCOPE, Store, clock, digest
from reconcile_evidence import text_proof

ACTOR = "codex_local_catalogue100_source_review"
OWN_BRANDS = {"dremc", "proforged3d", "west3d", "x3d"}


SEED_NAMES = (
    "catalogue100-materials-01.json",
    "catalogue100-hardware-01.json",
    "catalogue100-materials-02.json",
    "catalogue100-accessories-01.json",
)


def seed_paths():
    """Return reviewed product batches, excluding receipts and other evidence JSON."""
    return [Path(__file__).parent / "evaluation" / name for name in SEED_NAMES]


def load_ledger():
    active = ROOT / "reports/canonical-ledger-current.json"
    path = (
        active
        if active.exists()
        else ROOT / "reports/canonical-candidate-ledger-v1.json"
    )
    return json.loads(path.read_text())


def validate_entries(entries, ledger):
    keys = {e["key"] for e in ledger["entries"]}
    canonical = {e["canonical_key"] for e in ledger["entries"]}
    urls = {
        e["manufacturer_product_url"]
        for e in ledger["entries"]
        if e.get("manufacturer_product_url")
    }
    for entry in entries:
        if entry["key"] in keys or entry["canonical_key"] in canonical:
            raise ValueError(
                "Existing canonical product or alias; add evidence to its identity instead"
            )
        if entry["brand"].lower().replace(" ", "") in OWN_BRANDS:
            raise ValueError("Retailer own-brand excluded")
        if entry.get("manufacturer_product_url") in urls:
            raise ValueError(
                "Same manufacturer product page cannot count as a second cosmetic/package variant"
            )
        if not entry.get("distinctness_reason") or len(entry["facts"]) < 2:
            raise ValueError(
                "Useful scoped facts and distinct-product justification required"
            )
        if any(
            not f.get("proofs") or any(not p.get("quote") for p in f["proofs"])
            for f in entry["facts"]
        ):
            raise ValueError("Every supported fact needs exact source evidence")
        keys.add(entry["key"])
        canonical.add(entry["canonical_key"])
        if entry.get("manufacturer_product_url"):
            urls.add(entry["manufacturer_product_url"])


def prepare(store, seed, ledger):
    entries = seed["entries"]
    validate_entries(entries, ledger)
    sources = {}
    for name in seed["source_manifests"]:
        for source in json.loads((ROOT / "reports" / name).read_text()):
            if source.get("id"):
                sources[source["key"]] = source
    used = {p["source_key"] for e in entries for f in e["facts"] for p in f["proofs"]}
    for key in used:
        store.source(sources[key])
    records = []
    entities = []
    for entry in entries:
        group = "catalogue_c100_" + entry["key"]
        pid = "local_dev_product_" + group
        vid = "local_dev_variant_" + group
        common = {
            "group_key": group,
            "environment": SCOPE,
            "price": None,
            "physical_stock": None,
            "checkout_enabled": False,
        }
        product = {
            **common,
            "id": pid,
            "title": entry["title"],
            "brand": entry["brand"],
            "category": entry["category"],
            "canonical_identity_key": entry["canonical_key"],
            "kind": "manufacturer_knowledge_reference",
            "staging_product_id": None,
        }
        variant = {
            **common,
            "id": vid,
            "product_id": pid,
            "kind": "local_knowledge_reference_variant",
            "selected_supplier_variant": None,
            "staging_variant_id": None,
        }
        entities.append({"product": product, "variant": variant})
        claims = []
        for fact in entry["facts"]:
            citations = []
            for proof in fact["proofs"]:
                source = sources[proof["source_key"]]
                if proof.get("json_pointer"):
                    citation = {
                        "local_source_id": source["id"],
                        "source_url": source["source_url"],
                        "quote": proof["quote"],
                        "json_pointer": proof["json_pointer"],
                    }
                    if not store.cite(citation):
                        raise ValueError("Exact structured source proof failed")
                else:
                    citation = text_proof(store, source["id"], proof["quote"])
                citations.append(citation)
            claims.append(
                {
                    "field": fact["field"],
                    "label": fact.get("label", fact["field"].replace("_", " ")),
                    "value": fact["value"],
                    "text": fact["value"],
                    "status": "supported",
                    "citations": citations,
                    "query_pattern": fact["query_pattern"],
                    "keywords": entry["title"] + " " + fact["field"].replace("_", " "),
                }
            )
        unknowns = copy.deepcopy(entry.get("unknowns", []))
        for field, pattern, reason in [
            (
                "store_sale_price",
                r"price|cost|buy|order",
                "Live 3D Byte sale price is unknown; dated external observations are not current offers.",
            ),
            (
                "physical_stock_and_delivery",
                r"stock|available|delivery|shipping|dispatch",
                "Real stock, delivery and landed cost are not verified; no simulation is physical stock.",
            ),
            (
                "received_revision_package_and_fit",
                r"received|my printer|guarantee|certif|food.safe|medical|universal",
                "Received variant/revision, package, printer fit and certification are unverified beyond explicitly attributed source claims.",
            ),
        ]:
            unknowns.append(
                {"field": field, "query_pattern": pattern, "reason": reason}
            )
        for item in unknowns:
            claims.append(
                {
                    "field": item["field"],
                    "label": item["field"].replace("_", " "),
                    "value": None,
                    "text": item["reason"],
                    "status": "unknown",
                    "citations": [],
                    "query_pattern": item["query_pattern"],
                    "keywords": entry["title"] + " " + item["field"].replace("_", " "),
                }
            )
        if len({c["field"] for c in claims}) != len(claims):
            raise ValueError("Duplicate claim field")
        records.append(
            {
                "id": "local_dev_document_" + group,
                "record_key": group + "_source",
                "kind": "source_document",
                "title": entry["title"] + " — scoped product reference",
                "group_key": group,
                "environment": SCOPE,
                "local_record_schema_version": 2,
                "local_product_id": pid,
                "local_variant_id": vid,
                "staging_native_id": None,
                "staging_export_allowed": False,
                "native_approval": None,
                "source_scope": entry["source_scope"],
                "reference_aliases": entry["aliases"],
                "factual_decision_basis": {
                    "kind": "agent_source_review_for_authorized_local_development",
                    "reviewer_type": "codex_agent",
                    "reviewer_actor": ACTOR,
                    "user_factual_review_claimed": False,
                    "native_reviewer_event": False,
                    "verification": "Canonical identity and distinctness reviewed; source bytes and exact excerpts verified; manufacturer scope, conditions/conflicts and dated AUD observations retained.",
                    "batch_id": seed["batch_id"],
                },
                "explicit_unknowns": {u["field"]: None for u in unknowns},
                "claims": claims,
            }
        )
    return records, entities, [sources[k] for k in sorted(used)]


def activate(seed_path, report_name):
    target = ROOT / "reports" / report_name
    if Path(report_name).name != report_name or target.exists():
        raise ValueError("New report basename required")
    seed = json.loads(Path(seed_path).read_text())
    ledger = load_ledger()
    store = Store()
    try:
        before = store.stats()
        prior = {r["id"]: dict(r) for r in store.db.execute("SELECT * FROM records")}
        backup = ROOT / "exports" / (Path(report_name).stem + "-before.sqlite3")
        if backup.exists():
            raise ValueError("Prior backup preserved")
        db = sqlite3.connect(backup)
        try:
            store.db.backup(db)
        finally:
            db.close()
        records, entities, sources = prepare(store, seed, ledger)
        result = store.ingest(records, actor=ACTOR, local_references=entities)
        for identifier, row in prior.items():
            if (
                dict(
                    store.db.execute(
                        "SELECT * FROM records WHERE id=?", (identifier,)
                    ).fetchone()
                )
                != row
            ):
                raise ValueError("Existing record changed")
        for entry, record in zip(seed["entries"], records):
            ledger["entries"].append(
                {
                    "key": entry["key"],
                    "canonical_key": entry["canonical_key"],
                    "group_key": record["group_key"],
                    "title": entry["title"],
                    "brand": entry["brand"],
                    "category": entry["category"],
                    "manufacturer_product_url": entry.get("manufacturer_product_url"),
                    "distinctness_reason": entry["distinctness_reason"],
                    "origin": seed["batch_id"],
                    "status": "accepted_local_source_review",
                    "counted": True,
                    "record_revision": digest(record),
                    "reviewer_actor": ACTOR,
                }
            )
        ledger["last_updated"] = clock()
        ledger["counted_products"] = sum(e["counted"] for e in ledger["entries"])
        ledger["stored_products"] = store.stats()["products"]
        ledger_history = (
            ROOT / "reports" / ("canonical-ledger-" + seed["batch_id"] + ".json")
        )
        with ledger_history.open("x") as stream:
            stream.write(json.dumps(ledger, indent=2) + "\n")
        (ROOT / "reports/canonical-ledger-current.json").write_text(
            json.dumps(ledger, indent=2) + "\n"
        )
        from retrieval import Retriever

        index = Retriever(store).train()
        report = {
            "batch_id": seed["batch_id"],
            "reviewer_actor": ACTOR,
            "before": before,
            "after": store.stats(),
            "import_result": result,
            "valid_distinct_count": ledger["counted_products"],
            "legacy_kit_count_pending": sum(
                e["status"] == "legacy_kit_original_brand_pending"
                for e in ledger["entries"]
            ),
            "ledger_snapshot": str(ledger_history),
            "before_snapshot": str(backup),
            "source_versions": sources,
            "record_revisions": [
                {"record_key": r["record_key"], "revision": digest(r)} for r in records
            ],
            "preserved_existing_records": len(prior),
            "index": index,
            "native_approvals_created": 0,
            "user_approval_claimed": False,
            "services_started": False,
            "paid_model_calls": 0,
        }
        with target.open("x") as stream:
            stream.write(json.dumps(report, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "batch": seed["batch_id"],
                    "created": result["created"],
                    "stored_products": report["after"]["products"],
                    "valid_distinct_count": ledger["counted_products"],
                    "active_claims": report["after"]["claims"],
                }
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("seed")
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    activate(args.seed, args.report)
