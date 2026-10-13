"""Prepare truthful unbound retailer references. Offline; no native IDs or approvals created."""

import argparse
import copy
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path

from local_store import ROOT
from verify_retailer_kit_evidence import REVIEW, verify

HERE = Path(__file__).resolve().parent


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        if data.strip():
            self.parts.append(data.strip())


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build_plan(review):
    errors = verify(review)
    if errors:
        raise ValueError("Source review failed: " + ", ".join(errors))
    source = next(
        x for x in review["sources"] if x["source_id"] == "retailer_variant_data"
    )
    raw = json.loads((ROOT / source["raw_path"]).read_bytes())
    parser = PlainText()
    parser.feed(raw["description"])
    description = " ".join(parser.parts)
    # The short shared retailer note is observed; it is not a selected kit BOM or store contents claim.
    radio_quote = "Radio Transmitter, Receiver, and Battery are not included"
    print_quote = "Printed Parts and STL are also not included"
    assert radio_quote in description and print_quote in description
    entries = []
    for record in review["records"]:
        observed = record["retailer_observation"]
        sku = observed["retailer_sku"]
        index = int(
            record["retailer_identity_evidence"]["variant_pointer"].split("/")[-1]
        )
        variant = raw["variants"][index]
        assert (
            variant["sku"] == sku
            and str(variant["id"]) == observed["retailer_variant_id"]
        )
        known = [
            (
                "retailer_source_sku",
                "Retailer source SKU",
                sku,
                sku,
                "/variants/" + str(index) + "/sku",
            ),
            (
                "retailer_source_variant_id",
                "Retailer source variant ID",
                str(variant["id"]),
                str(variant["id"]),
                "/variants/" + str(index) + "/id",
            ),
            (
                "retailer_variant_title",
                "Retailer variant title",
                variant["title"],
                variant["title"],
                "/variants/" + str(index) + "/title",
            ),
            (
                "retailer_listing_title",
                "Retailer listing title",
                raw["title"],
                raw["title"],
                "/title",
            ),
            (
                "retailer_vendor_metadata",
                "Retailer vendor metadata; not verified manufacturer",
                raw["vendor"],
                raw["vendor"],
                "/vendor",
            ),
            (
                "retailer_shared_radio_battery_exclusion",
                "Shared listing note: radio/battery exclusion",
                "Retailer shared listing note excludes transmitter, receiver and battery.",
                radio_quote,
                "/description",
            ),
            (
                "retailer_shared_printed_stl_exclusion",
                "Shared listing note: printed parts/STLs exclusion",
                "Retailer shared listing note excludes printed model parts and STLs.",
                print_quote,
                "/description",
            ),
        ]
        unknown = [
            ("kit_manufacturer", "Verified kit manufacturer"),
            ("exact_kit_included_contents", "Exact selected kit included contents"),
            ("exact_kit_excluded_contents", "Exact selected kit excluded contents"),
            ("exact_model_release_compatibility", "Exact model release compatibility"),
            ("kit_revision", "Kit revision"),
            ("supplier_bom_revision", "Supplier BOM revision"),
            ("esc_battery_connector_type", "ESC battery connector type"),
            ("small_servo_quantity", "Small-servo quantity for exact selected kit"),
            ("store_kit_sku", "Actual store kit SKU"),
            (
                "store_digital_access_included",
                "Actual store kit digital access inclusion",
            ),
            ("physical_stock", "Actual physical stock"),
        ]
        facts = [
            {"field": field, "label": label, "value": value, "evidence_excerpt": quote}
            for field, label, value, quote, pointer in known
        ]
        facts += [
            {"field": field, "label": label, "value": None, "evidence_excerpt": ""}
            for field, label in unknown
        ]
        title = "Retailer reference: DREMC " + sku + " — " + variant["title"]
        text = (
            "Scope: captured DREMC retailer identity for source SKU "
            + sku
            + ". Shared listing exclusions are retailer statements. Exact supplier BOM contents/version and actual store fulfilment remain unresolved.\n\n"
            + "\n\n".join(
                dict.fromkeys(quote for field, label, value, quote, pointer in known)
            )
        )
        template = {
            "documentId": None,
            "medusa_product_id": None,
            "product_handle": None,
            "product_title": title,
            "title": title + " — captured retailer identity",
            "document_type": "other",
            "source_url": source["source_url"],
            "source_kind": "supplier_product_page",
            "source_label": "DREMC retailer variant metadata and shared listing note",
            "source_checked_at": source["checked_at"],
            "version": "capture-"
            + source["checked_at"][:10].replace("-", "")
            + "-"
            + source["raw_sha256"][:12],
            "language": "en",
            "is_public": False,
            "publishedAt": None,
            "knowledge_content": {
                "version": 1,
                "variant_id": None,
                "source_sha256": source["raw_sha256"],
                "text": text,
                "facts": facts,
            },
            "knowledge_review": {
                "status": "pending",
                "document_id": None,
                "product_id": None,
                "variant_id": None,
                "revision_hash": None,
                "reviewed_at": None,
                "valid_until": None,
            },
        }
        fixture = copy.deepcopy(template)
        fixture.update(
            documentId="local_dev_fixture_doc_dremc_" + sku.lower(),
            medusa_product_id="local_dev_fixture_product_dremc_" + sku.lower(),
            product_handle="local-fixture-dremc-" + sku.lower(),
        )
        fixture["knowledge_content"]["variant_id"] = (
            "local_dev_fixture_variant_dremc_" + sku.lower()
        )
        entries.append(
            {
                "reference_key": "retailer_dremc_" + sku,
                "reference_identity": {
                    "retailer": "DREMC",
                    "source_sku": sku,
                    "source_variant_id": str(variant["id"]),
                    "variant_title": variant["title"],
                    "source_namespace": "dremc_shopify",
                    "exact_claimed_identity": "captured retailer variant, not a verified store fulfilment kit",
                },
                "source_sidecar": {
                    "source_id": source["source_id"],
                    "raw_path": source["raw_path"],
                    "raw_sha256": source["raw_sha256"],
                    "field_evidence": [
                        {
                            "field": field,
                            "json_pointer": pointer,
                            "excerpt_sha256": digest(quote.encode()),
                            "interpretation": "Exact raw JSON value"
                            if pointer != "/description"
                            else "Exact derived plain-text excerpt from shared retailer listing description",
                        }
                        for field, label, value, quote, pointer in known
                    ],
                },
                "native_binding": {
                    "product_id": None,
                    "variant_id": None,
                    "document_id": None,
                    "product_handle": None,
                    "current_exact_binding_verified": False,
                },
                "reference_policy": {
                    "intended_scope": "staging",
                    "catalogue_role": "knowledge_reference",
                    "required_product_status": "draft",
                    "required_variant_count": 1,
                    "required_variant_prices": [],
                    "checkout_enabled": False,
                    "price": None,
                    "physical_stock": None,
                    "physical_possession_required": False,
                    "native_writes_authorized": False,
                },
                "simulation_metadata_template": {
                    "version": 1,
                    "scope": "staging",
                    "real_stock": False,
                    "product_id": None,
                    "variant_id": None,
                    "initial_quantity": 0,
                    "quantity_is_controlled_test_example": True,
                },
                "observed_retail_offer_only": {
                    "price_aud": observed["observed_price_aud"],
                    "available_at_capture": observed["observed_available"],
                    "checked_at": source["checked_at"],
                    "copy_to_native_reference_price_or_inventory": False,
                },
                "native_record_template": template,
                "local_contract_fixture": {
                    "namespace": "local_development_fixture_only",
                    "native_record_for_structure_check": fixture,
                    "synthetic_publication_for_review_projection_only": True,
                    "reviewer_approval_created": False,
                },
                "source_fields_ready_for_factual_review": True,
                "factual_user_approval": None,
                "native_apply_ready": False,
                "reference_only_remaining_requirements": [
                    "Current exact native draft product/variant/document binding or specifically authorized creation of this selected retailer-reference identity.",
                    "Genuine factual review of this exact scoped document; then native review matching the final canonical revision and required publication metadata.",
                    "Parent-coordinated staging activation/release verification; prices remain empty and checkout disabled.",
                ],
                "commercial_only_requirements": [
                    "Actual store SKU and supplier fulfilment package/BOM/kit revision.",
                    "Verified actual included/excluded contents, connector and optional-servo quantities.",
                    "Exact supported model release/body/gearbox options and digital access/licence scope.",
                    "Commerce price, real inventory, shipping and fulfilment settings.",
                ],
                "supplier_bom_disposition": "Retain as separate family-scoped local observations. It is not explicitly SKU/revision bound and is not relabelled to a native approved source kind.",
                "rollback_plan": {
                    "local": "Withdraw only the three fixture document IDs; preserve canary, capture/chunk history and replay receipt. Reimport with a newer local snapshot to restore.",
                    "future_native": "Capture before-state and returned IDs/revisions; unpublish or remove only the exact reference binding through the agreed path after separate authorization. Do not delete products or clear unrelated metadata.",
                },
            }
        )
    return {
        "schema_version": 1,
        "environment": "local_development",
        "fixture_only": True,
        "intended_native_scope": "staging",
        "native_apply_authorized": False,
        "native_approval_created": False,
        "native_staging_ids_invented": False,
        "physical_possession_required_for_reference_only": False,
        "guide_faq_content_ingested": False,
        "source_review_sha256": digest(REVIEW.read_bytes()),
        "retailer_source_sha256": source["raw_sha256"],
        "entries": entries,
        "local_fixtures_are_not_native_bindings": True,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    if Path(args.report).name != args.report or not args.report.endswith(".json"):
        raise ValueError("A new JSON report basename is required")
    plan = build_plan(json.loads(REVIEW.read_text()))
    with (ROOT / "reports" / args.report).open("x") as stream:
        stream.write(json.dumps(plan, indent=2, ensure_ascii=False) + "\n")
    print(
        json.dumps(
            {
                "references": len(plan["entries"]),
                "supported_identity_and_listing_facts": sum(
                    sum(
                        f["value"] is not None
                        for f in e["native_record_template"]["knowledge_content"][
                            "facts"
                        ]
                    )
                    for e in plan["entries"]
                ),
                "unknowns": sum(
                    sum(
                        f["value"] is None
                        for f in e["native_record_template"]["knowledge_content"][
                            "facts"
                        ]
                    )
                    for e in plan["entries"]
                ),
                "native_apply_authorized": False,
                "physical_possession_required": False,
            }
        )
    )


if __name__ == "__main__":
    main()
