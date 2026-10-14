"""Partial reference preparation does not require or invent commercial fulfilment facts."""

import json
import unittest

from prepare_kit_reference_plan import HERE, build_plan
from verify_retailer_kit_evidence import REVIEW


class ReferencePlanTests(unittest.TestCase):
    def setUp(self):
        self.review = json.loads(REVIEW.read_text())

    def test_three_exact_retailer_identities_have_supported_partial_documents(self):
        plan = build_plan(self.review)
        self.assertEqual(len(plan["entries"]), 3)
        for entry in plan["entries"]:
            facts = entry["native_record_template"]["knowledge_content"]["facts"]
            self.assertTrue(entry["source_fields_ready_for_factual_review"])
            self.assertEqual(sum(f["value"] is not None for f in facts), 7)
            self.assertTrue(
                any(
                    f["field"] == "exact_kit_included_contents" and f["value"] is None
                    for f in facts
                )
            )

    def test_reference_only_policy_does_not_need_physical_possession_or_price(self):
        plan = build_plan(self.review)
        self.assertFalse(plan["physical_possession_required_for_reference_only"])
        for entry in plan["entries"]:
            policy = entry["reference_policy"]
            self.assertFalse(policy["physical_possession_required"])
            self.assertFalse(policy["checkout_enabled"])
            self.assertIsNone(policy["price"])
            self.assertEqual(policy["required_variant_prices"], [])
            self.assertEqual(
                entry["simulation_metadata_template"]["initial_quantity"], 0
            )
            self.assertFalse(entry["simulation_metadata_template"]["real_stock"])

    def test_native_bindings_and_approvals_are_not_filled_from_retailer_ids(self):
        plan = build_plan(self.review)
        for entry in plan["entries"]:
            template = entry["native_record_template"]
            self.assertIsNone(template["documentId"])
            self.assertIsNone(template["medusa_product_id"])
            self.assertIsNone(template["knowledge_content"]["variant_id"])
            self.assertEqual(template["knowledge_review"]["status"], "pending")
            self.assertIsNone(template["knowledge_review"]["revision_hash"])
            self.assertFalse(entry["native_apply_ready"])
            self.assertIsNone(entry["factual_user_approval"])

    def test_supplier_family_rows_are_not_claimed_as_exact_kit_contents(self):
        for entry in build_plan(self.review)["entries"]:
            fields = {
                f["field"]: f["value"]
                for f in entry["native_record_template"]["knowledge_content"]["facts"]
            }
            self.assertIsNone(fields["exact_kit_included_contents"])
            self.assertIsNone(fields["exact_kit_excluded_contents"])
            self.assertIsNone(fields["kit_revision"])
            self.assertNotIn("bearing_count", fields)
            self.assertIn("separate family-scoped", entry["supplier_bom_disposition"])

    def test_connector_servo_and_manufacturer_unknowns_do_not_block_identity_facts(
        self,
    ):
        for entry in build_plan(self.review)["entries"]:
            fields = {
                f["field"]: f["value"]
                for f in entry["native_record_template"]["knowledge_content"]["facts"]
            }
            self.assertIsNone(fields["esc_battery_connector_type"])
            self.assertIsNone(fields["small_servo_quantity"])
            self.assertIsNone(fields["kit_manufacturer"])
            self.assertIsNotNone(fields["retailer_source_sku"])

    def test_source_corruption_fails_before_creating_plan(self):
        self.review["sources"][0]["raw_sha256"] = "0" * 64
        with self.assertRaises(ValueError):
            build_plan(self.review)

    def test_promoted_supplier_unknown_is_rejected_before_plan(self):
        self.review["records"][2]["unknowns"]["small_servo_quantity"] = 1
        with self.assertRaises(ValueError):
            build_plan(self.review)

    def test_committed_plan_matches_current_verified_evidence(self):
        committed = json.loads(
            (HERE / "evaluation/retailer-reference-mapping-plan.json").read_text()
        )
        self.assertEqual(committed, build_plan(self.review))

    def test_repeated_offline_preparation_has_stable_logical_keys_and_body(self):
        self.assertEqual(build_plan(self.review), build_plan(self.review))


if __name__ == "__main__":
    unittest.main()
