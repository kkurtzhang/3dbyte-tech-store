"""Bounded nine-field search result: preserve origin/conditions, never relabel old sources."""

import argparse
import hashlib
import json
from pathlib import Path
from local_store import ROOT, Store, clock
from reconcile_evidence import (
    checked_source,
    text_proof,
    record_claim,
    checked_citations,
)
from guide_citation_sources import PublicJSON, walk, seal_derived


def product_description(source):
    parser = PublicJSON()
    parser.feed(Path(source["raw_path"]).read_text())
    products = [
        obj
        for root in parser.objects
        for obj in walk(root)
        if obj.get("@type") == "Product"
    ]
    if not products:
        raise ValueError("Product-scoped structured description required")
    return products[0]


def build(store):
    maker = json.loads(
        (ROOT / "reports/guide-equivalent-public-capture-v1.json").read_text()
    )
    maker = checked_source(store, maker["id"])
    supplier_sources = [
        s
        for s in json.loads(
            (ROOT / "reports/guide-equivalent-supplier-captures-v1.json").read_text()
        )
        if s.get("id")
    ]
    pad = next(s for s in supplier_sources if "pad_supplier" in s["id"])
    pad = checked_source(store, pad["id"])
    adapter = next(s for s in supplier_sources if "adapter_supplier" in s["id"])
    adapter = checked_source(store, adapter["id"])
    # Preserve the original captured text bytes; seal a reader-compatible LF-normalized version.
    for name, source in [("pad_supplier_lf", pad), ("adapter_supplier_lf", adapter)]:
        text = Path(source["text_path"]).read_text()
        if hashlib.sha256(text.encode()).hexdigest() != source["text_sha256"]:
            normalized = seal_derived(
                store,
                source,
                name,
                text,
                {
                    "kind": "text_newline_normalization",
                    "original_capture_time_preserved": True,
                },
            )
            if name == "pad_supplier_lf":
                pad = normalized
            else:
                adapter = normalized
    pad_product = product_description(pad)
    adapter_product = product_description(adapter)
    if (
        "Part Number: 4004010278" not in pad_product["description"]
        or pad_product["name"] != "Creality Nozzle Wiper Adhesive Tape for K2 Plus"
    ):
        raise ValueError("Supplier pad identity mismatch")
    if (
        adapter_product["sku"] != "4004010288"
        or "Approximately 37 x 12 x 1.6mm" not in adapter_product["description"]
    ):
        raise ValueError("Supplier adapter identity/condition mismatch")
    rows = []

    def add(key, field, status, origin, proofs, condition):
        rows.append(
            {
                "original_record_key": key,
                "original_field": field,
                "search_disposition": status,
                "equivalent_origin": origin,
                "citations": proofs,
                "condition": condition,
                "original_source_relabelled": False,
                "independent_corroboration_claimed": False,
                "active_source_document_changed": False,
                "native_eligible": False,
            }
        )

    add(
        "prior_R12_E08",
        "manufacturer_part_number",
        "exact_official_equivalent_found",
        "manufacturer_product_page",
        [text_proof(store, maker["id"], "4001030145")],
        "Exact manufacturer item number on the selected K2 Plus heating-block product page; electrical limits/package/batch remain unresolved.",
    )
    add(
        "prior_R12_E08",
        "manufacturer_model",
        "exact_official_equivalent_found",
        "manufacturer_product_page",
        [text_proof(store, maker["id"], "K2 Plus Ceramic Heating Block")],
        "Named K2 Plus reference only; no K2 Pro or other-model transfer.",
    )
    for original, field, source_record in [
        ("prior_R14_E08", "manufacturer_module_part", "prior_R14_S22"),
        ("prior_R16_E09", "manufacturer_adapter_part", "prior_R16_S24"),
        ("prior_R18_E10", "manufacturer_circuit_board_part", "prior_R18_S26"),
    ]:
        _, _, fact = record_claim(store, source_record, "supplier_listed_part_number")
        add(
            original,
            field,
            "already_prepared_supplier_corroboration",
            "supplier_product_page",
            checked_citations(store, fact["citations"]),
            "Existing supplier-listed identifier already has a native preparation. Retain supplier attribution; it does not turn the original support article into a manufacturer sales page.",
        )
    add(
        "prior_R14_E08",
        "manufacturer_pad_part",
        "qualified_supplier_corroboration_found",
        "supplier_product_page",
        [text_proof(store, pad["id"], "Part Number: 4004010278")],
        "Supplier reports the pad identifier. Seller SKU MLE06901 is separate; no module contents, wider model guarantee or manufacturer-source claim.",
    )
    proof = "K2/K2 Pro/K2 Plus Hotend Adapter Board_37×12×1.6_1"
    add(
        "prior_R16_E09",
        "manufacturer_named_model",
        "already_available_supplier_corroboration",
        "supplier_product_page",
        [text_proof(store, "local_source_earlier_S24", proof)],
        "Supplier names K2 Pro within a broader family listing; manufacturer-only model assertion continues to rely on the original wiki.",
    )
    add(
        "prior_R16_E09",
        "manufacturer_adapter_dimensions",
        "qualified_supplier_corroboration_found",
        "supplier_product_page",
        [text_proof(store, adapter["id"], "Approximately 37 x 12 x 1.6mm")],
        "Explicitly approximate supplier dimensions; do not promote to exact received measurement or manufacturer-certified tolerance.",
    )
    add(
        "prior_R12_K2IMAGE6",
        "component_materials",
        "held_no_complete_allowed_text_equivalent",
        "manufacturer_component_diagram",
        [],
        "No exact allowed text found proving all three component assignments and SKD11 grade together. Diagram/transcription remain valid local evidence but native-held; no partial vendor wording or temperature headline substitutes for the full claim.",
    )
    return {
        "prepared_at": clock(),
        "actor": "codex_local_guide_citation_review",
        "source_form_policy_changed": False,
        "original_holds_preserved": 9,
        "exact_official_equivalents": 2,
        "qualified_or_existing_supplier_corroborations": 6,
        "supplier_source_independence_established": False,
        "supplier_corroboration_scope": "Six field-level matches across supplier listings, including existing captures. Origin and upstream independence are not established; these are not six independent sources.",
        "no_complete_text_equivalent": 1,
        "rows": rows,
        "native_approvals_created": 0,
        "new_user_approval_claimed": False,
        "scope": "Equivalent evidence and condition report; no active manufacturer assertion is rewritten as a retailer claim.",
        "remaining_native_prerequisites": "Choose a source-specific projection with honest origin, actual bindings and final native review. Original source forms are not retroactively relabelled.",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    name = parser.parse_args().report
    target = ROOT / "reports" / name
    if Path(name).name != name or not name.endswith(".json") or target.exists():
        raise ValueError("New report basename required")
    store = Store()
    try:
        report = build(store)
        with target.open("x") as f:
            f.write(json.dumps(report, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "report": str(target),
                    "official_equivalents": 2,
                    "supplier_corroborations": 6,
                    "still_no_complete_text": 1,
                    "native_eligible": 0,
                }
            )
        )
    finally:
        store.close()
