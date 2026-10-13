"""Consolidate bounded v1 evidence; prepare exact official equivalents without native writes."""

import argparse
import copy
import json
from pathlib import Path
from urllib.parse import urlparse
from local_store import ROOT, Store, clock, digest
from prepare_import_readiness import (
    build_readiness,
    source_review,
    reviewed_source_kind,
)
from prepare_guide_equivalents import product_description
from reconcile_evidence import (
    SEED,
    atom_candidate,
    checked_citations,
    checked_source,
    decompose,
    record_claim,
    refresh_candidate,
    sha,
    text_proof,
)

ACTOR = "codex_local_v1_handoff_review"
OFFICIAL_SOURCE_ID = "local_source_guide_equivalent_k2_hotend_e0df8cf55452"
OFFICIAL_URL = "https://mvip.creality.com/en/goods/goodsDetail/2309"
HERE = Path(__file__).parent


def pinned_report(receipt_name, report_name):
    receipt = json.loads((HERE / "evaluation" / receipt_name).read_text())
    item = receipt["reports"][report_name]
    if sha(item["path"]) != item["sha256"]:
        raise ValueError("Prior report bytes changed")
    return json.loads(Path(item["path"]).read_text()), item


def prepare_official(store, plan):
    source = checked_source(store, OFFICIAL_SOURCE_ID)
    if (
        source["source_url"] != OFFICIAL_URL
        or reviewed_source_kind(source, store) != "official_product_page"
    ):
        raise ValueError("Exact reviewed official product-page source required")
    row, record, part = record_claim(store, "prior_R12_E08", "manufacturer_part_number")
    _, _, model = record_claim(store, "prior_R12_E08", "manufacturer_model")
    if (
        record.get("group_key") != "prior_R12"
        or part["value"] != "4001030145"
        or model["value"] != "K2 Plus"
    ):
        raise ValueError("Original product or model scope changed")
    quote = "Item Number\nK2 Plus Ceramic Heating Block\n4001030145"
    proof = text_proof(store, OFFICIAL_SOURCE_ID, quote)
    candidate = atom_candidate(
        store,
        plan,
        row,
        {"target_group_key": "prior_R12", "source_id": OFFICIAL_SOURCE_ID},
    )
    candidate.update(
        local_record_id=row["id"],
        local_record_revision=row["revision"],
        factual_review_basis_preserved=copy.deepcopy(record["factual_decision_basis"]),
    )
    candidate["source_review"] = source_review(store, candidate)
    candidate["source_review"]["acceptance_covers_original_facts_only"] = True
    candidate["source_review"]["new_equivalent_projection_review"] = (
        "See derived_preparation_review; historical local acceptance is not approval of this new source projection."
    )
    candidate["source_kind_classification"] = (
        "Exact Creality product sales page reviewed under the existing official_product_page form; no support/image reclassification."
    )
    candidate["native_template"]["document_title"] = (
        "Creality K2 Plus ceramic heating block 4001030145 — official product-page reference"
    )
    candidate["structure_fixture_only"]["document_title"] = candidate[
        "native_template"
    ]["document_title"]
    results = []
    for claim in [part, model]:
        candidate["native_template"]["facts"].append(
            {
                "field": claim["field"],
                "label": claim["label"],
                "value": claim["value"],
                "evidence_excerpt": quote,
            }
        )
        candidate["source_sidecar"]["field_proofs"].append(
            {"field": claim["field"], "citations": [copy.deepcopy(proof)]}
        )
        review = {
            "actor": ACTOR,
            "reviewed_at": clock(),
            "status": "source_specific_preparation_evidence_checked",
            "original_record_id": row["id"],
            "original_revision": row["revision"],
            "original_field": claim["field"],
            "field": claim["field"],
            "source_id": OFFICIAL_SOURCE_ID,
            "source_sha256": source["sha256"],
            "source_form": "official_product_page",
            "same_product_model_scope_verified": True,
            "native_review_event": False,
            "new_user_approval_claimed": False,
            "not_an_existing_local_record_claim": True,
        }
        candidate.setdefault("derived_preparation_review", []).append(review)
        results.append(
            {
                "record_key": row["record_key"],
                "original_field": claim["field"],
                "original_revision": row["revision"],
                "candidate_key": candidate["candidate_key"],
                "value": claim["value"],
                "citations": [copy.deepcopy(proof)],
                "disposition": "exact_official_equivalent_prepared",
                "original_hold_preserved": True,
                "review": review,
            }
        )
    candidate["native_template"]["facts"].append(
        {
            "field": "component_materials",
            "label": "Complete component and material-grade assignments",
            "value": None,
            "evidence_excerpt": "",
        }
    )
    candidate["unresolved_equivalent_conditions"] = [
        "Component assignments including SKD11 lack complete allowed text evidence.",
        "Named K2 Plus item only; no K2 Pro or wider fit transfer.",
        "Heater power, voltage, operating limit, package/orifice/thermistor/sock and batch remain unresolved.",
    ]
    refresh_candidate(candidate)
    return results


def supplier_provenance(store, equivalent_report, plan):
    result = []
    for match in equivalent_report["rows"]:
        if match["equivalent_origin"] != "supplier_product_page":
            continue
        citations = checked_citations(store, match["citations"])
        ids = {c["local_source_id"] for c in citations}
        if len(ids) != 1:
            raise ValueError("Publisher-specific provenance requires one source")
        source = checked_source(store, next(iter(ids)))
        product = product_description(source)
        brand = product.get("brand")
        if not isinstance(brand, dict) or brand.get("name") != "Creality":
            raise ValueError("Expected captured Creality-branded seller listing")
        existing = [
            c["candidate_key"]
            for c in plan["single_source_candidate_fragments"]
            if c["source_sidecar"]["local_source_id"] == source["id"]
            and any(
                f["field"] == "supplier_listed_part_number" and f["value"] is not None
                for f in c["native_template"]["facts"]
            )
        ]
        identifier = match["original_field"] in {
            "manufacturer_module_part",
            "manufacturer_adapter_part",
            "manufacturer_circuit_board_part",
        }
        retained = identifier and bool(existing)
        result.append(
            {
                "original_record_key": match["original_record_key"],
                "original_field": match["original_field"],
                "source_id": source["id"],
                "source_url": source["source_url"],
                "publisher_host": urlparse(source["source_url"]).hostname,
                "raw_sha256": source["sha256"],
                "captured_at": source["captured_at"],
                "structured_product": {
                    k: product.get(k) for k in ["name", "brand", "manufacturer", "sku"]
                },
                "product_node_sha256": digest(product),
                "citations": citations,
                "publisher_role": "Seller or marketplace publishing a Creality-branded product listing.",
                "first_party_for_own_listing": True,
                "original_technical_fact_author_established": False,
                "upstream_content_lineage": "Not established; shared part numbers or wording do not prove independent authorship or prove mirroring.",
                "mirror_status": "unverified",
                "independence_established": False,
                "manufacturer_fact_replacement_allowed": False,
                "original_supplier_of_received_stock_established": False,
                "existing_supplier_identifier_preparation_retained": retained,
                "existing_candidate_keys": existing if retained else [],
                "condition": match["condition"],
                "disposition": "retain_existing_supplier_listing_preparation"
                if retained
                else "retain_attributed_observation_only; no original-manufacturer replacement or new native fact prepared",
                "reviewer_actor": ACTOR,
                "native_review_event": False,
            }
        )
    if len(result) != 6:
        raise ValueError("Bounded six-field supplier review required")
    return result


def build_handoff(store):
    previous, previous_ref = pinned_report(
        "guide-citation-activation-receipt-v1.json",
        "guide-equivalent-evidence-plan-v2.json",
    )
    reconciliation_path = ROOT / "reports/evidence-reconciliation-v1.json"
    receipt = json.loads(
        (HERE / "evaluation/evidence-reconciliation-receipt-v1.json").read_text()
    )
    # Find the pinned full report without relying on the order of receipt fields.
    refs = []

    def collect(value):
        if isinstance(value, dict):
            if value.get("path") == str(reconciliation_path) and value.get("sha256"):
                refs.append(value)
            for item in value.values():
                collect(item)
        elif isinstance(value, list):
            for item in value:
                collect(item)

    collect(receipt)
    if len(refs) != 1 or sha(reconciliation_path) != refs[0]["sha256"]:
        raise ValueError("Pinned reconciliation report required")
    original = json.loads(reconciliation_path.read_text())
    plan = build_readiness(store)
    decompose(store, json.loads(SEED.read_text()), plan)
    prior_candidates = {
        c["candidate_key"]: digest(c)
        for c in original["prepared_native_plan"]["single_source_candidate_fragments"]
    }
    if prior_candidates != {
        c["candidate_key"]: digest(c) for c in plan["single_source_candidate_fragments"]
    }:
        raise ValueError("Existing reconciled candidates must remain unchanged")
    official = prepare_official(store, plan)
    suppliers = supplier_provenance(store, previous, plan)
    candidates = plan["single_source_candidate_fragments"]
    plan.update(
        preparation_actor=ACTOR,
        scope="Consolidated current v1 preparation plus two exact official equivalents; original records and holds retained",
        offline_structural_candidate_count=len(candidates),
        supported_fact_count=sum(
            f["value"] is not None
            for c in candidates
            for f in c["native_template"]["facts"]
        ),
        local_stats=store.stats(),
        official_equivalent_preparation_facts_added=2,
        original_source_form_holds_preserved=9,
        original_fields_with_official_equivalent_preparation=2,
        local_source_review_event_count=len(
            {c["source_review"]["existing_local_event"]["id"] for c in candidates}
        ),
    )
    for blocker in plan["blocker_matrix"]:
        if "affected_fragments" in blocker:
            blocker["affected_fragments"] = len(candidates)
        if blocker["category"] == "unsupported_or_unresolved_facts":
            blocker.update(
                original_source_form_holds_preserved=9,
                original_fields_with_exact_official_equivalents_prepared=2,
                original_fields_without_original_manufacturer_text_equivalent=7,
            )
    unknowns = []
    for row in store.db.execute(
        "SELECT record_key,revision,payload FROM records WHERE active=1 ORDER BY record_key"
    ):
        record = json.loads(row["payload"])
        for claim in record["claims"]:
            if claim["status"] == "unknown":
                unknowns.append(
                    {
                        "record_key": row["record_key"],
                        "revision": row["revision"],
                        "group_key": record.get("group_key"),
                        "field": claim["field"],
                        "label": claim["label"],
                        "value": None,
                        "reason": claim["text"],
                    }
                )
    return {
        "schema_version": 1,
        "prepared_at": clock(),
        "actor": ACTOR,
        "current_corpus": store.stats(),
        "prior_reconciliation": refs[0],
        "prior_equivalent_report": previous_ref,
        "official_equivalent_reconciliation": official,
        "supplier_provenance": suppliers,
        "original_source_form_holds": copy.deepcopy(original["source_type_gaps"]),
        "unresolved_active_facts": unknowns,
        "prepared_native_plan": plan,
        "new_source_versions_registered": 0,
        "active_records_changed": 0,
        "new_local_store_review_events": 0,
        "new_native_approvals": 0,
        "new_user_approval_claimed": False,
        "source_form_policy_changed": False,
        "bounded_local_evidence_scope_complete": True,
        "completion_basis": "Two exact official facts prepared; all six supplier matches audited without treating them as original/independent technical sources. Remaining original manufacturer and complete diagram evidence is unestablished. Existing supplier preparations preserved.",
        "next_supported_action": "Choose and explicitly authorize a native target and reference-only scope, then perform protected duplicate/identity preflight using existing access. Create or reconcile private drafts and actual product/variant/document IDs only under that authorization; review the final canonical native revision under a real reviewer identity. Parent owns release/index gates. Further fixture-only work cannot supply these identities, review or authorization.",
        "services_started": False,
        "staging_or_shared_database_writes": 0,
        "model_calls": 0,
        "three_d_sets_build_guides_and_faqs": "official_link_only",
    }


def prepare(name):
    report = ROOT / "reports" / name
    plan = report.with_name(report.stem + "-native-plan.json")
    if (
        Path(name).name != name
        or not name.endswith(".json")
        or report.exists()
        or plan.exists()
    ):
        raise ValueError("New report basename required")
    store = Store()
    try:
        data = build_handoff(store)
        for path, body in [(report, data), (plan, data["prepared_native_plan"])]:
            with path.open("x") as stream:
                stream.write(json.dumps(body, indent=2, ensure_ascii=False) + "\n")
        print(
            json.dumps(
                {
                    "report": str(report),
                    "native_plan": str(plan),
                    "fragments": data["prepared_native_plan"][
                        "offline_structural_candidate_count"
                    ],
                    "positive_facts": data["prepared_native_plan"][
                        "supported_fact_count"
                    ],
                    "native_eligible": 0,
                    "active_record_changes": 0,
                }
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    prepare(parser.parse_args().report)
