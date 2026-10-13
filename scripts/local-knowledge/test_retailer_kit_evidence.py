"""Adversarial checks against independent immutable retailer/supplier source bytes."""

import json
import unittest
from verify_retailer_kit_evidence import REVIEW, verify


class KitEvidence(unittest.TestCase):
    def setUp(self):
        self.review = json.loads(REVIEW.read_text())

    def test_actual_source_bytes_and_observations(self):
        self.assertEqual(verify(self.review), [])

    def test_wrong_retailer_price_and_variant_are_rejected(self):
        self.review["records"][0]["retailer_observation"]["observed_price_aud"] = 7
        self.review["records"][0]["retailer_observation"]["retailer_variant_id"] = (
            "wrong"
        )
        self.assertTrue(any("retailer_observation" in x for x in verify(self.review)))

    def test_changed_supplier_quantity_is_rejected(self):
        self.review["records"][0]["supplier_bom"]["observed_components"][0][
            "quantity"
        ] = 99
        self.assertTrue(any("supplier_quantity" in x for x in verify(self.review)))

    def test_meter_quantity_cannot_become_an_item_count(self):
        wire = next(
            component
            for component in self.review["records"][0]["supplier_bom"][
                "observed_components"
            ]
            if component["quantity_text"] == "1 meter"
        )
        self.assertIsNone(wire["quantity"])
        wire["quantity"] = 1
        self.assertTrue(any("supplier_quantity" in x for x in verify(self.review)))

    def test_source_hash_drift_is_rejected(self):
        self.review["sources"][0]["raw_sha256"] = "0" * 64
        self.assertTrue(any("source_bytes" in x for x in verify(self.review)))

    def test_observations_cannot_become_live_store_stock_or_approval(self):
        self.review["records"][0]["actual_store"]["physical_stock"] = 7
        self.review["records"][0]["native_import"]["eligible"] = True
        errors = verify(self.review)
        self.assertTrue(any("store_mapping" in x for x in errors))
        self.assertTrue(any("native_approval" in x for x in errors))

    def test_connector_conflict_and_blank_servo_quantity_remain_unknown(self):
        self.review["records"][0]["unknowns"]["esc_battery_connector_type"] = "XT60"
        self.review["records"][2]["unknowns"]["small_servo_quantity"] = 1
        errors = verify(self.review)
        self.assertTrue(any("unresolved_field" in x for x in errors))
        self.assertTrue(any("blank_servo" in x for x in errors))

    def test_soon_model_does_not_become_compatible(self):
        self.review["records"][1]["future_model_compatibility"][
            "model_16_winch_truck"
        ] = True
        self.assertTrue(any("future_model" in x for x in verify(self.review)))


if __name__ == "__main__":
    unittest.main()
