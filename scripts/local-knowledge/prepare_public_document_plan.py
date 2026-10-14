"""Plan native Product Document intake without writing source stores or services.

Historical draft matches are candidates, never identity authorization. Local
review decisions remain local; genuine native decisions must bind a real actor
to the exact canonical native revision after authoritative identity readback.
"""

import argparse
import hashlib
import json
import re
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit

TABLES = ("products", "records", "claims", "sources", "editorial_decisions")
GATES = [
    "fresh_authoritative_product_and_exact_variant_readback",
    "reconcile_existing_draft_and_published_document_identities",
    "atomic_product_source_intake_identity",
    "source_bytes_and_semantic_evidence_review",
    "genuine_native_revision_review",
    "explicit_native_write_and_publication_authorization",
]


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_snapshot(path, expected_hash):
    path = Path(path).resolve(strict=True)
    if digest(path) != expected_hash:
        raise ValueError("Frozen corpus hash mismatch")
    # Never instantiate local_store.Store: that opens the active DB for writes.
    db = sqlite3.connect(path.as_uri() + "?mode=ro&immutable=1", uri=True)
    db.row_factory = sqlite3.Row
    try:
        result = {}
        for table in TABLES:
            rows = []
            for row in db.execute(f"SELECT * FROM {table}"):
                item = dict(row)
                if isinstance(item.get("payload"), str):
                    item["payload"] = json.loads(item["payload"])
                rows.append(item)
            result[table] = rows
        return result
    finally:
        db.close()


def words(value):
    return re.findall(r"[a-z0-9]+", str(value or "").lower())


def candidate_matches(product, rows):
    payload = product["payload"]
    title = " ".join(words(payload.get("title")))
    evidence = payload.get("listed_identity_evidence") or {}
    parts = [
        evidence.get("manufacturer_sku"),
        *evidence.get("listed_reference_parts", []),
    ]
    parts = [
        str(p).lower()
        for p in parts
        if p and len(str(p)) >= 4 and re.search(r"[0-9]", str(p))
    ]
    candidates = []
    stop = {
        "reference",
        "retailer",
        "package",
        "family",
        "product",
        "the",
        "for",
        "and",
        "with",
        "from",
    }
    terms = set(words(title)) - stop
    for row in rows:
        if row.get("soft_deleted"):
            continue
        name = " ".join(words(row.get("name")))
        candidate_terms = set(words(name)) - stop
        overlap = terms & candidate_terms
        similarity = len(overlap) / max(1, len(terms | candidate_terms))
        searchable = " ".join(
            [str(row.get("name") or ""), *[str(v) for v in row.get("sku_names", [])]]
        ).lower()
        matched_parts = [
            part
            for part in parts
            if re.search(
                r"(?<![a-z0-9])" + re.escape(part) + r"(?![a-z0-9])", searchable
            )
        ]
        if matched_parts:
            basis = "listed_part_token_requires_brand_package_verification"
        elif title and title == name:
            basis = "exact_normalized_title_requires_native_readback"
        elif len(overlap) >= 3 and similarity >= 0.45:
            basis = "title_overlap_research_candidate_only"
        else:
            continue
        candidates.append(
            {
                "draft_id": row.get("draft_id"),
                "name": row.get("name"),
                "draft_status": row.get("status"),
                "historical_product_id": row.get("product_id"),
                "basis": basis,
                "matched_part_tokens": matched_parts,
                "title_token_overlap": round(similarity, 4),
                "identity_confirmed": False,
            }
        )
    return sorted(
        candidates,
        key=lambda x: (
            -bool(x["matched_part_tokens"]),
            -x["title_token_overlap"],
            x["draft_id"] or "",
        ),
    )


def build_plan(data, ledger, inventory):
    entries = {e.get("group_key", e["key"]): e for e in ledger["entries"]}
    rows = inventory["rows"]
    products = []
    for product in sorted(data["products"], key=lambda x: x["group_key"]):
        key = product["group_key"]
        entry = entries.get(key, {})
        candidates = candidate_matches(product, rows)
        products.append(
            {
                "group_key": key,
                "title": product["payload"].get("title"),
                "local_product_id": product["id"],
                "counted_reference": entry.get("counted") is True,
                "disposition": "prepare_only"
                if entry.get("counted") is True
                else "held",
                "ledger_reason": entry.get("reason"),
                "listed_identity_evidence": product["payload"].get(
                    "listed_identity_evidence"
                ),
                "native_binding": {
                    "product_id": None,
                    "variant_id": None,
                    "product_handle": None,
                },
                "identity_state": "unmatched"
                if not candidates
                else "historical_candidate_requires_readback"
                if len(candidates) == 1
                else "ambiguous_historical_candidates",
                "historical_identity_candidates": candidates,
            }
        )
    by_group = {p["group_key"]: p for p in products}
    reviews = defaultdict(list)
    for event in data["editorial_decisions"]:
        reviews[(event.get("record_id"), event.get("revision"))].append(
            {
                k: event.get(k)
                for k in ("id", "actor", "scope", "decision", "decided_at", "revision")
            }
        )
    documents = []
    for record in sorted(data["records"], key=lambda x: x.get("record_key", x["id"])):
        if not record.get("active"):
            continue
        payload = record["payload"]
        claims = payload.get("claims", [])
        citations = [
            citation for claim in claims for citation in claim.get("citations", [])
        ]
        sources = sorted(
            {
                (
                    c.get("source_url", ""),
                    c.get("original_response_sha256", ""),
                    c.get("source_text_sha256", ""),
                    c.get("checked_at", ""),
                )
                for c in citations
            }
        )
        parent = by_group.get(record["group_key"])
        held = not parent or parent["disposition"] == "held"
        editorial = record["kind"] != "source_document"
        documents.append(
            {
                "local_record_id": record["id"],
                "record_key": record.get("record_key"),
                "group_key": record["group_key"],
                "kind": record["kind"],
                "title": record.get("title"),
                "local_revision": record["revision"],
                "disposition": "held"
                if held
                else "editorial_review_only"
                if editorial
                else "prepare_source_fragments",
                "native_document_id": None,
                "native_approval": None,
                "canonical_native_revision": None,
                "source_fragments": [
                    {
                        "source_url": url,
                        "source_sha256": raw,
                        "text_sha256": text,
                        "checked_at": checked,
                    }
                    for url, raw, text, checked in sources
                ],
                "distinct_source_hosts": sorted(
                    {
                        urlsplit(c.get("source_url", "")).hostname
                        for c in citations
                        if urlsplit(c.get("source_url", "")).hostname
                    }
                ),
                "existing_native_body_template": bool(payload.get("source_body")),
                "claim_status_counts": dict(
                    sorted(Counter(c.get("status", "unknown") for c in claims).items())
                ),
                "unknown_fields": sorted(
                    c.get("field")
                    for c in claims
                    if c.get("status") == "unknown" and c.get("field")
                ),
                "local_review_events": reviews.get(
                    (record["id"], record["revision"]), []
                ),
                "factual_policy_status": "requires_claim_level_review_not_inferred_from_local_supported_label",
                "gates": GATES,
            }
        )
    active_rows = [row for row in rows if not row.get("soft_deleted")]
    matched = {
        c["draft_id"] for p in products for c in p["historical_identity_candidates"]
    }
    active_claims = [c for c in data["claims"] if c.get("active")]
    return {
        "version": 1,
        "mode": "dry_run",
        "write_ready": False,
        "planner_attribution": {
            "actor": "codex_native_product_document_planning",
            "action": "inventory_and_candidate_reconciliation_only",
            "native_review_event_created": False,
            "factual_approvals_created": 0,
        },
        "review_policy": {
            "factual_evidence": "official_source_or_two_independent_sources, with exact identity and claim entailment checked by the actual reviewer",
            "source_independence": "Different domains alone do not establish independent evidence; citations may repeat a manufacturer feed.",
            "native_attribution": "Record the actual authorized agent or human actor and immutable canonical native revision; do not impersonate a human or relabel local events.",
            "unknowns": "Keep null; never fill from family or sibling-variant assumptions.",
            "prices": "Dated external AUD evidence stays historical; current offers and stock come from Medusa commerce.",
            "restricted_content": "3DSets build-guide and FAQ bodies remain link-only; editorial guides are a separate review lane.",
        },
        "inventory": {
            "stored_local_products": len(products),
            "counted_references": sum(p["counted_reference"] for p in products),
            "held_references": sum(p["disposition"] == "held" for p in products),
            "active_records": len(documents),
            "record_kinds": dict(Counter(d["kind"] for d in documents)),
            "active_claim_statuses": dict(Counter(c["status"] for c in active_claims)),
            "sources": len(data["sources"]),
            "local_editorial_decisions": len(data["editorial_decisions"]),
            "native_bindings_confirmed": 0,
            "native_approvals_created": 0,
            "historical_active_draft_rows": len(active_rows),
            "historical_unique_draft_names": len({r.get("name") for r in active_rows}),
            "historical_rows_with_product_id": sum(
                bool(r.get("product_id")) for r in active_rows
            ),
            "local_identity_states": dict(
                Counter(p["identity_state"] for p in products)
            ),
        },
        "historical_inventory_scope": inventory.get("scope", {}),
        "historical_inventory_is_current_authority": False,
        "products": products,
        "documents": documents,
        "unmatched_historical_drafts": [
            {k: row.get(k) for k in ("draft_id", "name", "status", "product_id")}
            for row in active_rows
            if row.get("draft_id") not in matched
        ],
        "ordered_next_steps": [
            "Read current native product/variant identities and exact existing Strapi product/source documents; compare duplicate draft and published versions without replacing identities.",
            "Resolve held identity conflicts and each exact variant; never create a draft shell merely to satisfy this knowledge contract.",
            "Review source bytes and each fact under the evidence policy; split source bodies into bounded documents and preserve source-relative citations, unknowns and historical price labels.",
            "Use atomic authorized native intake, keeping existing document IDs; read back native IDs/title/handle/source metadata before hashing.",
            "Record the genuine authenticated native review event for that canonical revision; content or identity changes invalidate approval.",
            "After publication authorization, sync the existing public-document index and connect the bounded assistant retrieval tool; verify withdrawal, timeout, wrong variant and recovery before activation.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--snapshot-sha256", required=True)
    parser.add_argument("--ledger", type=Path, required=True)
    parser.add_argument("--historical-identities", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    inputs = [args.snapshot, args.ledger, args.historical_identities]
    if args.output.resolve() in {p.resolve() for p in inputs}:
        raise ValueError("Output must not replace an input")
    data = read_snapshot(args.snapshot, args.snapshot_sha256)
    plan = build_plan(
        data,
        json.loads(args.ledger.read_text()),
        json.loads(args.historical_identities.read_text()),
    )
    plan["inputs"] = [{"path": str(p.resolve()), "sha256": digest(p)} for p in inputs]
    # Exclusive creation also prevents accidental replacement of earlier reports.
    with args.output.open("x") as target:
        json.dump(plan, target, indent=2, ensure_ascii=False)
        target.write("\n")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "inventory": plan["inventory"],
                "write_ready": False,
            }
        )
    )


if __name__ == "__main__":
    main()
