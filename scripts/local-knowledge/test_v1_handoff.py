"""Final preparations preserve original evidence, attribution and inactive native gates."""

import json
import unittest
from local_store import ROOT, Store, digest
from prepare_import_readiness import reviewed_source_kind
from prepare_v1_handoff import build_handoff, OFFICIAL_SOURCE_ID


class V1HandoffTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = Store()
        cls.before = cls.table_digests()
        cls.report = build_handoff(cls.store)

    @classmethod
    def tearDownClass(cls):
        assert cls.table_digests() == cls.before
        cls.store.close()

    @classmethod
    def table_digests(cls):
        names = [
            r[0]
            for r in cls.store.db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        ]
        return {
            name: digest(
                sorted(
                    [
                        tuple(v.hex() if isinstance(v, bytes) else v for v in r)
                        for r in cls.store.db.execute("SELECT * FROM " + name)
                    ],
                    key=str,
                )
            )
            for name in names
        }

    def test_exact_official_projection_keeps_identity_unknowns_and_pending_review(self):
        plan = self.report["prepared_native_plan"]
        candidates = [
            c
            for c in plan["single_source_candidate_fragments"]
            if c["source_sidecar"]["local_source_id"] == OFFICIAL_SOURCE_ID
        ]
        self.assertEqual(len(candidates), 1)
        candidate = candidates[0]
        self.assertEqual(candidate["local_group_key"], "prior_R12")
        facts = {f["field"]: f for f in candidate["native_template"]["facts"]}
        self.assertEqual(facts["manufacturer_part_number"]["value"], "4001030145")
        self.assertEqual(facts["manufacturer_model"]["value"], "K2 Plus")
        for field in [
            "component_materials",
            "heater_power_w",
            "voltage_v",
            "max_operating_temperature_c",
            "package_orifice_thermistor_and_sock",
        ]:
            self.assertIsNone(facts[field]["value"])
        self.assertEqual(candidate["native_review"]["status"], "pending")
        self.assertIsNone(candidate["native_template"]["document_id"])
        self.assertFalse(candidate["apply_authorized"])
        self.assertFalse(candidate["selected_for_reference_card"])
        self.assertEqual(len(candidate["derived_preparation_review"]), 2)
        self.assertTrue(
            all(
                not r["native_review_event"]
                for r in candidate["derived_preparation_review"]
            )
        )
        for proof in candidate["source_sidecar"]["field_proofs"]:
            self.assertTrue(all(self.store.cite(c) for c in proof["citations"]))

    def test_supplier_provenance_does_not_promote_listing_to_manufacturer_fact(self):
        rows = self.report["supplier_provenance"]
        self.assertEqual(len(rows), 6)
        self.assertEqual(len({r["source_id"] for r in rows}), 5)
        self.assertEqual(len({r["publisher_host"] for r in rows}), 3)
        for row in rows:
            self.assertEqual(row["structured_product"]["brand"]["name"], "Creality")
            self.assertFalse(row["original_technical_fact_author_established"])
            self.assertFalse(row["independence_established"])
            self.assertFalse(row["manufacturer_fact_replacement_allowed"])
        self.assertEqual(
            sum(r["existing_supplier_identifier_preparation_retained"] for r in rows), 3
        )

    def test_original_holds_and_prepared_candidates_remain_intact(self):
        old = json.loads((ROOT / "reports/evidence-reconciliation-v1.json").read_text())
        self.assertEqual(
            self.report["original_source_form_holds"], old["source_type_gaps"]
        )
        self.assertEqual(len(self.report["original_source_form_holds"]), 9)
        plan = self.report["prepared_native_plan"]
        actual = {
            c["candidate_key"]: c for c in plan["single_source_candidate_fragments"]
        }
        for candidate in old["prepared_native_plan"][
            "single_source_candidate_fragments"
        ]:
            self.assertEqual(candidate, actual[candidate["candidate_key"]])
        self.assertEqual(plan["offline_structural_candidate_count"], 66)
        self.assertEqual(plan["supported_fact_count"], 164)
        self.assertEqual(plan["native_import_eligible_count"], 0)

    def test_exact_url_review_does_not_relax_other_source_forms(self):
        self.assertEqual(
            reviewed_source_kind(
                {"source_url": "https://mvip.creality.com/en/goods/goodsDetail/2309"},
                self.store,
            ),
            "official_product_page",
        )
        for url in [
            "https://mvip.creality.com/en/goods/goodsDetail/999999",
            "https://wiki.creality.com/en/k2-plus",
            "https://pic2-cdn.creality.com/diagram.jpg",
        ]:
            self.assertIsNone(reviewed_source_kind({"source_url": url}, self.store))


if __name__ == "__main__":
    unittest.main()
