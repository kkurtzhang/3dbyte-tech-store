"""Read-only native-preparation inventory; real binding/review remain null and apply is disabled."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse
from local_store import ROOT, Store, clock


def source_kind(source):
    url = urlparse(source["source_url"])
    host = url.hostname or ""
    path = url.path.lower()
    if (host == "polymaker.com" or host.endswith(".polymaker.com")) and path.endswith(
        ".pdf"
    ):
        if "tds" in path:
            return "official_datasheet"
        if "sds" in path:
            return "official_safety_sheet"
    if (
        host
        in {
            "shop.polymaker.com",
            "store.micro-swiss.com",
            "www.sliceengineering.com",
            "store.creality.com",
            "www.creality3dofficial.com",
            "e3d-online.com",
            "www.e3d-online.com",
        }
        and "/products/" in path
    ):
        return "official_product_page"
    if host in {
        "store.dremc.com.au",
        "phaserfpv.com.au",
        "www.phaserfpv.com.au",
        "b3d.com.au",
        "www.b3d.com.au",
        "www.proforged3d.com.au",
        "proforged3d.com.au",
    } and ("/products/" in path or "dispprod.asp" in path):
        return "supplier_product_page"
    return None


def build_manifest(store, classify_source=source_kind):
    products = {
        r["group_key"]: json.loads(r["payload"])
        for r in store.db.execute("SELECT group_key,payload FROM products")
    }
    sources = {
        r["id"]: json.loads(r["payload"])
        for r in store.db.execute("SELECT id,payload FROM sources")
    }
    records = [
        dict(r)
        for r in store.db.execute(
            "SELECT id,record_key,revision,payload FROM records WHERE active=1 ORDER BY record_key"
        )
    ]
    inventory = []
    candidates = []
    for row in records:
        record = json.loads(row["payload"])
        unknowns = [c for c in record["claims"] if c["status"] == "unknown"]
        groups = defaultdict(list)
        held = []
        for claim in record["claims"]:
            if claim["status"] == "unknown":
                continue
            if not claim["citations"] or not all(
                store.cite(c) for c in claim["citations"]
            ):
                held.append(
                    {
                        "field": claim["field"],
                        "reason": "source_bytes_excerpt_or_freshness_failed",
                    }
                )
                continue
            ids = {c["local_source_id"] for c in claim["citations"]}
            if claim["status"] != "supported":
                held.append(
                    {
                        "field": claim["field"],
                        "reason": "editorial_synthesis_requires_separate_native_curation",
                    }
                )
                continue
            if len(ids) != 1:
                held.append(
                    {
                        "field": claim["field"],
                        "reason": "multi_source_claim_requires_single_source_native_curation",
                    }
                )
                continue
            id = next(iter(ids))
            source = sources[id]
            kind = classify_source(source)
            if not kind:
                held.append(
                    {
                        "field": claim["field"],
                        "reason": "source_kind_not_classified_under_existing_native_allowlist",
                    }
                )
                continue
            if len(claim["value"]) > 500 or len(claim["label"]) > 120:
                held.append(
                    {
                        "field": claim["field"],
                        "reason": "native_fact_width_requires_curation",
                    }
                )
                continue
            quote = "\n".join(
                dict.fromkeys(
                    c.get("quote") or c.get("evidence_excerpt")
                    for c in claim["citations"]
                )
            )
            if len(quote) > 1500:
                held.append(
                    {
                        "field": claim["field"],
                        "reason": "native_excerpt_width_requires_curation",
                    }
                )
                continue
            groups[id].append(
                {
                    "field": claim["field"],
                    "label": claim["label"],
                    "value": claim["value"],
                    "evidence_excerpt": quote,
                    "source_proof_sidecar": claim["citations"],
                }
            )
        if record["kind"] != "source_document":
            # Do not relabel independent tables or generated guides as official manuals.
            groups.clear()
        record_candidates = []
        for id, facts in groups.items():
            source = sources[id]
            kind = classify_source(source)
            native_facts = [
                {k: c[k] for k in ("field", "label", "value", "evidence_excerpt")}
                for c in facts
            ]
            native_facts += [
                {
                    "field": c["field"],
                    "label": c["label"],
                    "value": None,
                    "evidence_excerpt": "",
                }
                for c in unknowns
            ]
            if len(native_facts) > 30:
                held.append(
                    {
                        "source_id": id,
                        "reason": "native_fact_count_requires_curation",
                    }
                )
                continue
            text = (
                "Scope: "
                + record["source_scope"]
                + "\n\nCurated exact source excerpts:\n"
                + "\n\n".join(
                    f["evidence_excerpt"] for f in native_facts if f["evidence_excerpt"]
                )
            )
            if len(text) > 20000:
                held.append(
                    {
                        "source_id": id,
                        "reason": "native_text_width_requires_curation",
                    }
                )
                continue
            key = row["record_key"] + "__" + id
            product = products.get(record.get("group_key"), {})
            body = {
                "version": 1,
                "document_id": None,
                "product_id": None,
                "variant_id": None,
                "product_handle": None,
                "product_title": product.get("title", record["title"]),
                "document_title": record["title"],
                "source_url": source["source_url"],
                "source_kind": kind,
                "source_sha256": source["sha256"],
                "source_version": "capture-"
                + source["captured_at"][:10]
                + "-"
                + source["sha256"][:12],
                "source_checked_at": source["captured_at"],
                "text": text,
                "facts": native_facts,
            }
            digest = hashlib.sha256(key.encode()).hexdigest()[:20]
            fixture = {
                **body,
                "document_id": "local_dev_fixture_v1_doc_" + digest,
                "product_id": "local_dev_fixture_v1_product_" + digest,
                "variant_id": "local_dev_fixture_v1_variant_" + digest,
                "product_handle": "local-fixture-v1-" + digest,
            }
            item = {
                "candidate_key": key,
                "local_record_id": row["id"],
                "local_record_revision": row["revision"],
                "local_group_key": record.get("group_key"),
                "native_template": body,
                "structure_fixture_only": fixture,
                "source_kind_classification": "proposal_from_exact_product/datasheet_URL; reviewer must confirm",
                "source_sidecar": {
                    "local_source_id": id,
                    "raw_sha256": source["sha256"],
                    "text_sha256": source["text_sha256"],
                    "raw_path": source["raw_path"],
                    "text_path": source["text_path"],
                    "field_proofs": [
                        {
                            "field": c["field"],
                            "citations": c["source_proof_sidecar"],
                        }
                        for c in facts
                    ],
                },
                "native_revision_hash": None,
                "native_review": {
                    "status": "pending",
                    "reviewed_at": None,
                    "valid_until": None,
                    "reviewer": None,
                },
                "is_public": False,
                "publishedAt": None,
                "apply_authorized": False,
                "factual_review_basis_preserved": record["factual_decision_basis"],
                "blocking_native_prerequisites": [
                    "exact_native_product_variant_document_binding",
                    "genuine_native_review_of_final_canonical_revision",
                    "authorized_private_preparation/publication",
                ],
            }
            candidates.append(item)
            record_candidates.append(key)
        inventory.append(
            {
                "record_key": row["record_key"],
                "local_record_id": row["id"],
                "local_revision": row["revision"],
                "kind": record["kind"],
                "candidate_fragments": record_candidates,
                "held_fields": held,
                "native_import_eligible": False,
                "native_approval": None,
            }
        )
    shells = [
        {
            "local_group_key": key,
            "local_identity_id": p["id"],
            "native_product_id": None,
            "native_variant_id": None,
            "policy": {
                "status": "draft",
                "catalogue_role": "knowledge_reference",
                "variant_count": 1,
                "prices": [],
                "card_price": None,
                "checkout_enabled": False,
                "physical_stock": None,
                "simulation": {
                    "real_stock": False,
                    "simulated_initial_quantity": 1,
                },
            },
            "native_create_or_update_authorized": False,
        }
        for key, p in sorted(products.items())
    ]
    manifest = {
        "schema_version": 1,
        "environment": "local_development",
        "prepared_at": clock(),
        "scope": "reference-only staged preparation inventory; no API payload is authorized",
        "native_apply_authorized": False,
        "native_approvals_created": 0,
        "native_import_eligible_count": 0,
        "physical_possession_required_for_reference_only": False,
        "local_stats": store.stats(),
        "record_inventory": inventory,
        "single_source_candidate_fragments": candidates,
        "reference_shell_plans": shells,
        "excluded_content": [
            "full guides/FAQs/manuals/diagrams",
            "generated_reference source-kind exception",
            "live price/inventory/checkout facts",
        ],
        "delivery_gates_separate": {
            "source_content_and_manifest": "this inventory and v1 checklist",
            "braces_security_deployment": "parent-owned release gates; not changed or bypassed",
        },
    }
    return manifest


def prepare(name):
    target = ROOT / "reports" / name
    if Path(name).name != name or not name.endswith(".json") or target.exists():
        raise ValueError("New report basename required")
    store = Store()
    try:
        manifest = build_manifest(store)
        with target.open("x") as f:
            f.write(json.dumps(manifest, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "records": len(manifest["record_inventory"]),
                    "single_source_candidate_fragments": len(
                        manifest["single_source_candidate_fragments"]
                    ),
                    "reference_shells": len(manifest["reference_shell_plans"]),
                    "native_import_eligible": 0,
                    "report": str(target),
                }
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--report", required=True)
    prepare(p.parse_args().report)
