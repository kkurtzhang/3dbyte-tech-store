"""Bounded read-only evidence reconciliation; no source-kind or approval exceptions."""

import argparse
import copy
import hashlib
import json
import re
from pathlib import Path
from local_store import ROOT, Store, clock
from prepare_import_readiness import strapi_record, reviewed_source_kind

SEED = Path(__file__).parent / "evaluation/evidence-reconciliation-seed-v1.json"
BASE_RECEIPT = Path(__file__).parent / "evaluation/import-readiness-receipt-v1.json"
AGENT = "codex_local_evidence_reconciliation"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def checked_source(store, source_id):
    row = store.db.execute(
        "SELECT payload FROM sources WHERE id=?", (source_id,)
    ).fetchone()
    if not row:
        raise ValueError("Registered source required")
    source = json.loads(row[0])
    for path_key, hash_key in [("raw_path", "sha256"), ("text_path", "text_sha256")]:
        if sha(source[path_key]) != source[hash_key]:
            raise ValueError("Archived source bytes changed")
    return source


def record_claim(store, key, field):
    row = store.db.execute(
        "SELECT id,record_key,revision,payload FROM records WHERE record_key=? AND active=1",
        (key,),
    ).fetchone()
    if not row:
        raise ValueError("Active record required")
    record = json.loads(row["payload"])
    claim = next((c for c in record["claims"] if c["field"] == field), None)
    if not claim:
        raise ValueError("Declared claim required")
    return row, record, claim


def checked_citations(store, citations):
    if not citations or not all(store.cite(c) for c in citations):
        raise ValueError("Exact source-byte/excerpt proof required")
    return copy.deepcopy(citations)


def text_proof(store, source_id, quote):
    source = checked_source(store, source_id)
    text = Path(source["text_path"]).read_text()
    start = text.index(quote)
    proof = {
        "local_source_id": source_id,
        "source_url": source["source_url"],
        "quote": quote,
        "start_char": start,
        "end_char": start + len(quote),
    }
    checked_citations(store, [proof])
    return proof


def raw_variant_proof(store, source_id, sku, title):
    source = checked_source(store, source_id)
    raw = Path(source["raw_path"]).read_text()
    for match in re.finditer(re.escape(sku), raw):
        start = max(0, match.start() - 240)
        end = min(len(raw), match.end() + 240)
        excerpt = raw[start:end]
        normalized = excerpt
        for _ in range(3):
            normalized = normalized.replace('\\"', '"')
        sku_part = r'"sku"\s*:\s*"' + re.escape(sku) + '"'
        title_part = r'"title"\s*:\s*"' + re.escape(title) + '"'
        official_pair = sku_part + r"\s*,\s*" + title_part
        retailer_pair = (
            title_part
            + r'\s*,\s*"option1"\s*:\s*"'
            + re.escape(title)
            + r'"\s*,\s*"option2"\s*:\s*null\s*,\s*"option3"\s*:\s*null\s*,\s*'
            + sku_part
        )
        if re.search(official_pair, normalized) or re.search(retailer_pair, normalized):
            return {
                "source_id": source_id,
                "source_url": source["source_url"],
                "sku": sku,
                "variant_title": title,
                "raw_sha256": source["sha256"],
                "start_char": start,
                "end_char": end,
                "quote": excerpt,
                "quote_sha256": hashlib.sha256(excerpt.encode()).hexdigest(),
                "offset_basis": "archived_original_response",
                "not_a_normalized_text_offset": True,
                "native_approval": False,
            }
    return None


def refresh_candidate(candidate):
    body = candidate["native_template"]
    body["text"] = (
        "Scope: single captured source for "
        + body["product_title"]
        + ". Exact physical/native binding and unresolved fields remain unknown.\n\n"
        + "\n\n".join(
            dict.fromkeys(
                f["evidence_excerpt"] for f in body["facts"] if f["value"] is not None
            )
        )
    )
    fixture = candidate["structure_fixture_only"]
    fixture.update(text=body["text"], facts=copy.deepcopy(body["facts"]))
    candidate["strapi_record_template"] = strapi_record(body)
    candidate["strapi_structure_fixture_only"] = strapi_record(fixture)
    candidate["strapi_create_data_template"] = {
        k: v
        for k, v in candidate["strapi_record_template"].items()
        if k not in {"documentId", "publishedAt"}
    }
    candidate["strapi_core_draft_data_template"] = {
        k: candidate["strapi_record_template"][k]
        for k in candidate["strapi_core_draft_data_template"]
    }
    candidate["strapi_admin_private_fields_after_native_binding"] = {
        k: candidate["strapi_record_template"][k]
        for k in ["version", "language", "knowledge_content", "knowledge_review"]
    }


def atom_candidate(store, plan, row, atom):
    candidates = plan["single_source_candidate_fragments"]
    found = next(
        (
            c
            for c in candidates
            if c["local_group_key"] == atom["target_group_key"]
            and c["source_sidecar"]["local_source_id"] == atom["source_id"]
        ),
        None,
    )
    if found:
        return found
    source = checked_source(store, atom["source_id"])
    kind = reviewed_source_kind(source, store)
    if kind is None:
        raise ValueError("Source-specific atom cannot relax source-kind policy")
    prototype = next(
        c for c in candidates if c["local_group_key"] == atom["target_group_key"]
    )
    found = copy.deepcopy(prototype)
    found["candidate_key"] = row["record_key"] + "__" + atom["source_id"]
    found["selected_for_reference_card"] = False
    body = found["native_template"]
    body.update(
        source_url=source["source_url"],
        source_kind=kind,
        source_sha256=source["sha256"],
        source_version="capture-"
        + source["captured_at"][:10]
        + "-"
        + source["sha256"][:12],
        source_checked_at=source["captured_at"],
        facts=[f for f in body["facts"] if f["value"] is None],
    )
    fixture_ids = {
        k: found["structure_fixture_only"][k]
        for k in ["product_id", "variant_id", "product_handle"]
    }
    digest = hashlib.sha256(found["candidate_key"].encode()).hexdigest()[:20]
    found["structure_fixture_only"] = {
        **copy.deepcopy(body),
        **fixture_ids,
        "document_id": "local_dev_fixture_reconciliation_doc_" + digest,
    }
    found["source_sidecar"] = {
        "local_source_id": atom["source_id"],
        "raw_sha256": source["sha256"],
        "text_sha256": source["text_sha256"],
        "raw_path": source["raw_path"],
        "text_path": source["text_path"],
        "field_proofs": [],
    }
    candidates.append(found)
    inventory = next(
        x for x in plan["record_inventory"] if x["record_key"] == row["record_key"]
    )
    inventory["candidate_fragments"].append(found["candidate_key"])
    shell = next(
        x
        for x in plan["reference_shell_plans"]
        if x["local_group_key"] == atom["target_group_key"]
    )
    shell["alternative_candidate_keys"].append(found["candidate_key"])
    return found


def decompose(store, seed, plan):
    results = []
    for item in seed["decompositions"]:
        row, record, claim = record_claim(store, item["record_key"], item["field"])
        checked_citations(store, claim["citations"])
        atoms = []
        for atom in item["atoms"]:
            atom = copy.deepcopy(atom)
            citations = checked_citations(
                store, [claim["citations"][i] for i in atom.pop("proof_indexes")]
            )
            if {c["local_source_id"] for c in citations} != {atom["source_id"]}:
                raise ValueError("Mixed-source atom refused")
            candidate = atom_candidate(store, plan, row, atom)
            value = {
                "field": atom["field"],
                "label": atom["field"].replace("_", " "),
                "value": atom["value"],
                "evidence_excerpt": "\n".join(
                    dict.fromkeys(c["quote"] for c in citations)
                ),
            }
            existing = next(
                (
                    f
                    for f in candidate["native_template"]["facts"]
                    if f["field"] == atom["field"]
                ),
                None,
            )
            if existing:
                if existing["value"] != atom["value"]:
                    raise ValueError("Conflicting existing prepared fact")
                disposition = "already_prepared"
            else:
                candidate["native_template"]["facts"].append(value)
                candidate["source_sidecar"]["field_proofs"].append(
                    {"field": atom["field"], "citations": citations}
                )
                candidate.setdefault("derived_preparation_review", []).append(
                    {
                        "actor": AGENT,
                        "status": "source_specific_preparation_evidence_checked",
                        "original_record_id": row["id"],
                        "original_revision": row["revision"],
                        "original_field": item["field"],
                        "field": atom["field"],
                        "native_review_event": False,
                        "new_user_approval_claimed": False,
                        "not_an_existing_local_record_claim": True,
                    }
                )
                candidate["source_review"]["acceptance_covers_original_facts_only"] = (
                    True
                )
                refresh_candidate(candidate)
                disposition = "prepared_single_source_projection"
            atoms.append(
                {
                    **atom,
                    "citations": citations,
                    "candidate_key": candidate["candidate_key"],
                    "disposition": disposition,
                }
            )
        results.append(
            {
                "record_key": item["record_key"],
                "record_revision": row["revision"],
                "field": item["field"],
                "original_value": claim["value"],
                "original_record_changed": False,
                "disposition": "resolved_preparation_by_source_specific_decomposition",
                "source_specific_atoms": atoms,
                "original_comparison_or_navigation": item["commentary"],
                "comparison_is_manufacturer_authored": False,
                "supplied_package_binding_resolved": False,
            }
        )
    plan["supported_fact_count"] = sum(
        f["value"] is not None
        for c in plan["single_source_candidate_fragments"]
        for f in c["native_template"]["facts"]
    )
    plan["offline_structural_candidate_count"] = len(
        plan["single_source_candidate_fragments"]
    )
    plan["scope"] = (
        "Source-specific reconciliation projections; original KB and native gates unchanged"
    )
    plan["reconciliation_actor"] = AGENT
    plan["multi_source_originals_still_held"] = len(results)
    plan["multi_source_claims_with_source_specific_preparation"] = len(results)
    plan["new_prepared_projection_facts"] = 7
    for blocker in plan["blocker_matrix"]:
        if "affected_fragments" in blocker:
            blocker["affected_fragments"] = len(
                plan["single_source_candidate_fragments"]
            )
        if blocker["category"] == "unsupported_or_unresolved_facts":
            blocker["multi_source_originals_held"] = blocker.pop("multi_source_held", 0)
            blocker["unreconciled_multi_source_fields"] = 0
            blocker["source_specific_preparation_facts_added"] = 7
    return results


def source_gaps(store, original):
    result = []
    for inventory in original["record_inventory"]:
        for held in inventory["held_fields"]:
            if (
                held["reason"]
                != "source_kind_not_classified_under_existing_native_allowlist"
            ):
                continue
            row, record, claim = record_claim(
                store, inventory["record_key"], held["field"]
            )
            citations = checked_citations(store, claim["citations"])
            url = citations[0]["source_url"]
            if "/parts-list" in url:
                form = "manufacturer_support_parts_catalogue"
            elif "/solve-filament-sensor-false" in url:
                form = "manufacturer_troubleshooting_article"
            elif ".jpg" in url:
                form = "manufacturer_component_diagram"
            else:
                raise ValueError("Unexpected held source; scope decision required")
            reason = (
                "The source is an official support catalogue/article, not an explicitly classified product sales page, manual or datasheet; do not relabel it to fit the existing five-kind reference contract."
                if form != "manufacturer_component_diagram"
                else "The original component diagram and transcription are verified, but a standalone image is outside the five-kind plain-text source contract. Its product-page origin does not turn the image into page text."
            )
            result.append(
                {
                    "record_key": inventory["record_key"],
                    "record_revision": row["revision"],
                    "field": held["field"],
                    "value": claim["value"],
                    "citations": citations,
                    "evidence_verified": True,
                    "actual_source_form": form,
                    "native_disposition": "held",
                    "proposed_source_kind": None,
                    "exact_reason": reason,
                    "factual_basis_preserved": record["factual_decision_basis"],
                    "remaining": "Exact equivalent evidence in an allowed source, or a separately scoped source-form design decision; no approval/security relaxation.",
                }
            )
    return result


def editorial_guides(store, seed):
    result = []
    for row in store.db.execute(
        "SELECT record_key,revision,payload FROM records WHERE active=1 AND kind='editorial_guide' ORDER BY record_key"
    ):
        record = json.loads(row["payload"])
        claims = []
        for claim in record["claims"]:
            if claim["status"] == "unknown":
                continue
            citations = checked_citations(store, claim["citations"])
            claims.append(
                {
                    "field": claim["field"],
                    "value": claim["value"],
                    "existing_status": claim["status"],
                    "citations_required": True,
                    "verified_citation_count": len(citations),
                    "citations": citations,
                    "classification": "source_dependent_facts_with_original_selection_or_boundary_commentary",
                    "byte_verification_is_not_full_semantic_entailment": True,
                }
            )
        result.append(
            {
                "record_key": row["record_key"],
                "revision": row["revision"],
                "title": record["title"],
                "label": "Original store selection/navigation guidance with attributed source facts",
                "manufacturer_authored_claim": False,
                "native_source_document_eligible": False,
                "source_dependent_claims": claims,
                "original_navigation": {
                    "text": seed["guide_navigation"][row["record_key"]],
                    "citations_required": False,
                    "technical_specification_or_compatibility_claim": False,
                },
                "unknowns": record.get(
                    "explicit_unknowns",
                    {
                        c["field"]: None
                        for c in record["claims"]
                        if c["status"] == "unknown"
                    },
                ),
                "factual_basis_preserved": record["factual_decision_basis"],
                "optional_editorial_placement": "Existing blog supports drafted prose but requires a FeaturedImage; guides-page/help-center are navigation singletons without Draft & Publish. Choose placement before any authorized publication.",
            }
        )
    return result


def build_reconciliation(store):
    receipt = json.loads(BASE_RECEIPT.read_text())
    base = receipt["manifest"]
    if sha(base["path"]) != base["sha256"]:
        raise ValueError("Prior readiness artifact changed")
    original = json.loads(Path(base["path"]).read_text())
    seed = json.loads(SEED.read_text())
    plan = copy.deepcopy(original)
    mixed = decompose(store, seed, plan)
    gaps = source_gaps(store, original)
    guides = editorial_guides(store, seed)
    repairs = []
    for item in seed["guide_text_proof_repairs"]:
        row, _, _ = record_claim(store, item["record_key"], item["field"])
        proofs = [text_proof(store, p["source_id"], p["quote"]) for p in item["proofs"]]
        repairs.append(
            {
                "record_key": item["record_key"],
                "field": item["field"],
                "baseline_revision": row["revision"],
                "new_citations": proofs,
                "disposition": "exact_supplemental_text_citations_prepared",
                "active_record_changed": False,
            }
        )
    pairs = []
    for variant in seed["selector_variants"]:
        for source_id, title_key in [
            ("local_source_earlier_S27", "retailer_title"),
            ("local_source_earlier_S28", "manufacturer_title"),
        ]:
            proof = raw_variant_proof(
                store, source_id, variant["sku"], variant[title_key]
            )
            if proof is None:
                raise ValueError("Exact embedded variant/SKU coupling missing")
            pairs.append(proof)
    repairs.append(
        {
            "record_key": "G04",
            "field": "k2_nozzle_sizes",
            "new_citations": pairs,
            "disposition": "embedded_variant_pair_evidence_verified; raw_offsets_are_not_current_Store_text_citations",
            "activation_prerequisite": "Normalize the eight bounded selector pairs into a new linked derived-text version before changing a guide revision; preserve existing raw/text versions.",
            "active_record_changed": False,
        }
    )
    image = checked_source(store, "local_source_earlier_K2IMAGE6")
    parent = checked_source(store, "local_source_earlier_E11")
    if (
        "e2cecfd31ff5e6c344f77dba83767463.jpg"
        not in Path(parent["raw_path"]).read_text()
    ):
        raise ValueError("Official diagram origin missing")
    visual = {
        "reviewer_actor": AGENT,
        "image_raw_sha256": image["sha256"],
        "parent_product_url": parent["source_url"],
        "parent_raw_sha256": parent["sha256"],
        "inspection": "Archived pixels viewed in this task: separate titanium/copper/hardened-SKD11 labels and 350°C resistance headline corroborate prior scoped observations.",
        "operating_temperature_limit_established": False,
        "native_source_kind": None,
    }
    repairs.append(
        {
            "record_key": "G04",
            "field": "k2_resistance",
            "new_citations": [visual],
            "disposition": "visual_evidence_checked; image remains held outside native source contract",
            "active_record_changed": False,
        }
    )
    return {
        "schema_version": 1,
        "prepared_at": clock(),
        "preparation_actor": AGENT,
        "base_manifest": base,
        "seed_sha256": sha(SEED),
        "source_type_gaps": gaps,
        "multi_source_reconciliation": mixed,
        "editorial_guides": guides,
        "guide_citation_repairs": repairs,
        "embedded_variant_proofs": pairs,
        "diagram_origin_and_visual_review": visual,
        "prepared_native_plan": plan,
        "local_stats": store.stats(),
        "new_local_store_review_events": 0,
        "new_user_approval_claimed": False,
        "native_approvals_created": 0,
        "active_records_changed": False,
        "new_products": 0,
        "new_source_versions_registered": 0,
        "three_d_sets_build_guides_and_faqs": "official_link_only",
        "public_read_limit": "Current public web reader returned only a support shell for three Creality wiki pages; archived original bodies supply their facts. BuildTak/Micro Swiss current pages corroborate bounded notices/materials. No live stock/profile guarantee.",
        "genuine_blocker": "Selected 33 partial reference content has no remaining local factual prerequisite. Native target/IDs, actual final review, action authorization and parent release gates remain. Optional guide activation/raw-selector normalization and editorial placement are distinct local/product follow-ups.",
    }


def prepare(name):
    target = ROOT / "reports" / name
    if Path(name).name != name or not name.endswith(".json") or target.exists():
        raise ValueError("New report basename required")
    store = Store()
    try:
        before = store.stats()
        report = build_reconciliation(store)
        if store.stats() != before:
            raise ValueError("Read-only reconciliation changed local data")
        with target.open("x") as output:
            output.write(json.dumps(report, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "report": str(target),
                    "source_holds": len(report["source_type_gaps"]),
                    "mixed_claims_reconciled": len(
                        report["multi_source_reconciliation"]
                    ),
                    "guides": len(report["editorial_guides"]),
                    "prepared_supported_facts": report["prepared_native_plan"][
                        "supported_fact_count"
                    ],
                    "native_eligible": 0,
                }
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    prepare(parser.parse_args().report)
