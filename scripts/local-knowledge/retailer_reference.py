"""Persisted retailer-reference facts remain separate from store fulfilment and family BOMs."""

import json
import re

from query_constraints import live_commerce_requested

PREFIX = "retailer_dremc_"


def retailer_groups(question, claims):
    return sorted(
        {
            claim["group_key"]
            for claim in claims
            if (claim.get("group_key") or "").startswith(PREFIX)
            and claim["field"] == "retailer_source_sku"
            and claim["status"] == "supported"
            and re.search(r"\b" + re.escape(claim["value"]) + r"\b", question, re.I)
        }
    )


def retailer_intent(question):
    q = question.lower()
    if re.search(
        r"3d\s*byte|\byour store\b|\bour (?:store|kit|price)\b|\bmy kit\b|\bkit i (?:bought|purchased)\b",
        q,
    ):
        return (
            [],
            [
                "store_kit_sku",
                "store_digital_access_included",
                "exact_kit_included_contents",
            ],
            "actual_store_kit_unverified",
        )
    if live_commerce_requested(q) or re.search(
        r"\b(?:stock|availability|shipping|ship|dispatch|delivery|cost)\b", q
    ):
        return [], ["physical_stock"], "commerce_not_verified"
    if re.search(r"manufacturer|manufactures?|made by", q):
        return [], ["kit_manufacturer"], "retailer_manufacturer_unresolved"
    if re.search(r"connector|xt60|tamiya", q):
        return [], ["esc_battery_connector_type"], "retailer_connector_unresolved"
    if re.search(r"small.*servo|servo.*(?:quantity|how many)|how many.*servos?", q):
        return [], ["small_servo_quantity"], "retailer_servo_quantity_unresolved"
    if re.search(
        r"exact.*model|model.*(?:version|release)|compatible|compatibility|\bfit\b|\bsupports?\b",
        q,
    ):
        return (
            [],
            ["exact_model_release_compatibility"],
            "retailer_model_release_unresolved",
        )
    if re.search(
        r"separately|separate purchases|need to buy|must.*buy|not included|exclusions?",
        q,
    ):
        return (
            [
                "retailer_shared_radio_battery_exclusion",
                "retailer_shared_printed_stl_exclusion",
            ],
            [],
            "captured_shared_retailer_exclusions",
        )
    if re.search(r"\blicen[cs]e\b|\bfree\b", q):
        return [], ["store_digital_access_included"], "digital_access_terms_unverified"
    if re.search(r"\bstls?\b|digital.*files?|model files?", q):
        return (
            ["retailer_shared_printed_stl_exclusion"],
            [],
            "captured_retailer_stl_exclusion",
        )
    if re.search(r"radio|transmitter|receiver|\bbatter(?:y|ies)\b", q):
        return (
            ["retailer_shared_radio_battery_exclusion"],
            [],
            "captured_retailer_radio_battery_exclusion",
        )
    if re.search(r"included|inclusions|contents|parts|components|kit revision|bom", q):
        return (
            [],
            ["exact_kit_included_contents", "kit_revision", "supplier_bom_revision"],
            "exact_retailer_contents_unresolved",
        )
    return (
        ["retailer_source_sku", "retailer_variant_title", "retailer_vendor_metadata"],
        [],
        "captured_retailer_identity",
    )


def answer_retailer_reference(store, question, group, result):
    if not group or not group.startswith(PREFIX):
        return None
    rows = {
        json.loads(row["payload"])["field"]: (row, json.loads(row["payload"]))
        for row in store.rows()
        if json.loads(row["payload"]).get("group_key") == group
    }
    if "retailer_source_sku" not in rows:
        return {
            **result,
            "status": "unknown",
            "reason": "retailer_reference_unavailable",
            "unknown_fields": ["retailer_reference_identity"],
            "answer": "That retailer reference is not registered in the local corpus.",
        }
    sku = rows["retailer_source_sku"][1]["value"]
    known, unknown, reason = retailer_intent(question)
    if unknown:
        assert all(
            field in rows
            and rows[field][1]["status"] == "unknown"
            and rows[field][1]["value"] is None
            for field in unknown
        )
        message = (
            "For captured DREMC retailer reference "
            + sku
            + ", "
            + ", ".join(rows[field][1]["label"].lower() for field in unknown)
            + " remains unverified. Keep it unknown. Supplier family BOM observations do not prove an exact kit or model revision, and this reference does not establish a 3D Byte Tech offer or fulfilment."
        )
        return {
            **result,
            "status": "unknown",
            "reason": reason,
            "unknown_fields": unknown,
            "answer": message,
        }
    selected = []
    for field in known:
        row, claim = rows[field]
        citations = [store.cite(c) for c in claim["citations"]]
        if claim["status"] != "supported" or not citations or not all(citations):
            return {
                **result,
                "status": "unknown",
                "reason": "retailer_source_invalid",
                "unknown_fields": known,
                "answer": "The current source bytes/excerpts for this retailer reference are unavailable or changed; no positive claim can be rendered.",
            }
        selected.append(
            {
                "claim_id": row["id"],
                "statement": claim["text"],
                "value": claim["value"],
                "status": claim["status"],
                "record_id": claim["record_id"],
                "record_revision": claim["record_revision"],
                "citations": citations,
                "environment": claim["environment"],
                "local_product_id": claim["local_product_id"],
                "local_variant_id": claim["local_variant_id"],
                "source_scope": claim["source_scope"],
                "explicit_unknowns": claim["explicit_unknowns"],
                "editorial_basis": claim["editorial_basis"],
                "scope_conditions": {},
            }
        )
    return {
        **result,
        "status": "source_grounded_context",
        "reason": reason,
        "context_pack": selected,
        "answer": "\n".join(x["statement"] for x in selected),
    }
