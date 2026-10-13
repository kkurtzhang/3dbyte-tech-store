"""Offline verification of source-pinned third-party kit observations, never native import."""

import argparse
import hashlib
import json
from pathlib import Path

from local_store import ROOT

REVIEW = Path(__file__).resolve().parent / "evaluation/retailer-kit-review-v1.json"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify(review):
    errors = []
    documents = {}
    texts = {}
    for source in review["sources"]:
        raw = (ROOT / source["raw_path"]).resolve()
        text = (ROOT / source["text_path"]).resolve()
        if not all(path.is_relative_to(ROOT / "sources") for path in (raw, text)):
            errors.append("source_boundary:" + source["source_id"])
            continue
        if (
            digest(raw.read_bytes()) != source["raw_sha256"]
            or digest(text.read_bytes()) != source["text_sha256"]
        ):
            errors.append("source_bytes:" + source["source_id"])
            continue
        documents[source["source_id"]] = raw.read_bytes()
        texts[source["source_id"]] = text.read_text()
    if errors:
        return errors
    retailer = json.loads(documents["retailer_variant_data"])
    for record in review["records"]:
        key = record["record_key"]
        observed = record["retailer_observation"]
        variant = retailer["variants"][
            int(record["retailer_identity_evidence"]["variant_pointer"].split("/")[-1])
        ]
        expected = {
            "retailer_sku": variant["sku"],
            "retailer_variant_id": str(variant["id"]),
            "variant_title": variant["title"],
            "observed_price_aud": variant["price"] / 100,
            "observed_available": variant["available"],
            "retailer_vendor_metadata": retailer["vendor"],
        }
        if observed != expected:
            errors.append("retailer_observation:" + key)
        for component in record["supplier_bom"]["observed_components"]:
            evidence = component["evidence"]
            excerpt = texts[evidence["source_id"]][
                evidence["start_char"] : evidence["end_char"]
            ]
            cells = excerpt.split(" | ")
            if (
                digest(excerpt.encode()) != evidence["excerpt_sha256"]
                or len(cells) != 4
            ):
                errors.append("supplier_excerpt:" + key)
                continue
            quantity = int(cells[3]) if cells[3].isdigit() else None
            if (
                cells[:3]
                != [
                    str(component["supplier_row"]),
                    component["category"],
                    component["description"],
                ]
                or component["quantity"] != quantity
                or component["quantity_text"] != cells[3]
            ):
                errors.append("supplier_quantity_or_identity:" + key)
        if any(value is not None for value in record["actual_store"].values()):
            errors.append("unverified_store_mapping:" + key)
        if record["native_import"]["eligible"] is not False or any(
            value is not None
            for field, value in record["native_import"].items()
            if field != "eligible"
        ):
            errors.append("native_approval_claim:" + key)
        if any(
            record["unknowns"][field] is not None
            for field in [
                "exact_kit_manufacturer",
                "esc_battery_connector_type",
                "exact_model_release_compatibility",
                "kit_revision",
                "supplier_bom_revision",
            ]
        ):
            errors.append("unresolved_field_promoted:" + key)
        if (
            observed["retailer_sku"] == "WES2488"
            and record["future_model_compatibility"]["model_16_winch_truck"] is not None
        ):
            errors.append("future_model_promoted:" + key)
        if (
            observed["retailer_sku"] == "WES2489"
            and record["unknowns"]["small_servo_quantity"] is not None
        ):
            errors.append("blank_servo_quantity_promoted:" + key)
    if (
        review["staging_native_eligible"] is not False
        or review["native_approval"] is not None
        or review["guide_and_faq_content_ingested"] is not False
    ):
        errors.append("scope_or_reuse_boundary")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    if Path(args.report).name != args.report or not args.report.endswith(".json"):
        raise ValueError("Report basename must be JSON")
    review = json.loads(REVIEW.read_text())
    errors = verify(review)
    report = {
        "review_sha256": digest(REVIEW.read_bytes()),
        "records": len(review["records"]),
        "source_versions": len(review["sources"]),
        "component_observations": sum(
            len(x["supplier_bom"]["observed_components"]) for x in review["records"]
        ),
        "source_bytes_and_locators_verified": not errors,
        "native_import_eligible": False,
        "staging_writes": 0,
        "errors": errors,
    }
    with (ROOT / "reports" / args.report).open("x") as stream:
        stream.write(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
