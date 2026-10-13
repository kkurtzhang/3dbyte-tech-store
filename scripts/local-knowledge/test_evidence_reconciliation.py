"""Reconciliation cannot turn mixed evidence or navigation into native approval."""

import unittest
from unittest.mock import patch
from local_store import Store
from reconcile_evidence import build_reconciliation, raw_variant_proof


class EvidenceReconciliationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = Store()
        cls.before = cls.store.stats()
        cls.report = build_reconciliation(cls.store)

    @classmethod
    def tearDownClass(cls):
        assert cls.store.stats() == cls.before
        cls.store.close()

    def test_nine_source_type_holds_are_evidenced_but_not_relabelled(self):
        gaps = self.report["source_type_gaps"]
        self.assertEqual(len(gaps), 9)
        self.assertTrue(all(g["evidence_verified"] for g in gaps))
        self.assertTrue(all(g["native_disposition"] == "held" for g in gaps))
        self.assertTrue(all(g["proposed_source_kind"] is None for g in gaps))
        self.assertEqual(
            sum(
                g["actual_source_form"] == "manufacturer_component_diagram"
                for g in gaps
            ),
            1,
        )
        self.assertEqual(
            self.report["prepared_native_plan"]["native_import_eligible_count"], 0
        )

    def test_four_mixed_claims_become_separate_atoms_with_correct_product_scope(self):
        mixed = self.report["multi_source_reconciliation"]
        self.assertEqual(len(mixed), 4)
        atoms = [a for m in mixed for a in m["source_specific_atoms"]]
        self.assertEqual(len(atoms), 8)
        self.assertEqual(sum(a["disposition"] == "already_prepared" for a in atoms), 1)
        self.assertTrue(
            all(len({c["local_source_id"] for c in a["citations"]}) == 1 for a in atoms)
        )
        default = next(a for a in atoms if a["field"] == "official_default_nozzle")
        self.assertEqual(default["target_group_key"], "catalogue_flowtech_m3101")
        insert = next(a for a in atoms if a["field"] == "manufacturer_cm2_insert")
        self.assertEqual(insert["target_group_key"], "catalogue_flowtech_cm2_04")
        self.assertEqual(
            self.report["prepared_native_plan"]["supported_fact_count"], 162
        )
        self.assertTrue(all(m["original_record_changed"] is False for m in mixed))

    def test_guide_facts_are_not_exempted_as_original_commentary(self):
        guides = self.report["editorial_guides"]
        self.assertEqual(len(guides), 29)
        claims = [c for g in guides for c in g["source_dependent_claims"]]
        self.assertEqual(len(claims), 75)
        self.assertTrue(
            all(
                c["citations_required"] and c["verified_citation_count"] > 0
                for c in claims
            )
        )
        self.assertTrue(
            all(g["original_navigation"]["citations_required"] is False for g in guides)
        )
        self.assertTrue(
            all(g["native_source_document_eligible"] is False for g in guides)
        )
        self.assertTrue(all(g["manufacturer_authored_claim"] is False for g in guides))
        patches = self.report["guide_citation_repairs"]
        self.assertEqual(len(patches), 7)
        self.assertTrue(all(p["active_record_changed"] is False for p in patches))
        self.assertTrue(all(p["new_citations"] for p in patches))

    def test_embedded_selector_pairs_have_raw_not_normalized_offsets(self):
        proofs = self.report["embedded_variant_proofs"]
        self.assertEqual(len(proofs), 8)
        self.assertTrue(
            all(p["offset_basis"] == "archived_original_response" for p in proofs)
        )
        wrong = raw_variant_proof(
            self.store, "local_source_earlier_S27", "4008030090", "0.8mm (1pc)"
        )
        self.assertIsNone(wrong)

    def test_missing_bytes_cannot_create_a_positive_reconciliation(self):
        with patch.object(self.store, "cite", return_value=None):
            with self.assertRaises(ValueError):
                build_reconciliation(self.store)
        self.assertEqual(self.store.stats(), self.before)

    def test_no_native_or_user_review_events_and_old_scope_unchanged(self):
        self.assertEqual(self.report["native_approvals_created"], 0)
        self.assertEqual(self.report["new_user_approval_claimed"], False)
        self.assertEqual(self.report["new_local_store_review_events"], 0)
        self.assertEqual(self.report["local_stats"], self.before)
        self.assertEqual(
            len(self.report["prepared_native_plan"]["reference_shell_plans"]), 33
        )
        self.assertTrue(
            all(
                c["native_revision_hash"] is None
                for c in self.report["prepared_native_plan"][
                    "single_source_candidate_fragments"
                ]
            )
        )
        self.assertEqual(
            self.report["three_d_sets_build_guides_and_faqs"], "official_link_only"
        )


if __name__ == "__main__":
    unittest.main()
