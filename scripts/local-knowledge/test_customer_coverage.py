"""Persisted source and scope checks for the reconciled coverage guides and new products."""

import json
import unittest
from unittest.mock import patch
from activate_coverage_guides import ACTOR, prepare
from activate_catalogue_references import SEED, prepared_records
from local_store import Store
from retrieval import Retriever


class CoverageFollowupTests(unittest.TestCase):
    def setUp(self):
        self.store = Store()

    def tearDown(self):
        self.store.close()

    def test_guides_have_exact_local_review_and_available_sources(self):
        rows = [
            json.loads(r["payload"])
            for r in self.store.rows()
            if json.loads(r["payload"])["record_key"] in ("N12", "N13", "N14")
        ]
        self.assertEqual(len(rows), 14)
        self.assertEqual(sum(c["status"] == "editorial_inference" for c in rows), 6)
        self.assertEqual(sum(c["status"] == "unknown" for c in rows), 8)
        for claim in rows:
            decision = self.store.db.execute(
                "SELECT actor FROM editorial_decisions WHERE record_id=? AND revision=? ORDER BY id DESC LIMIT 1",
                (claim["record_id"], claim["record_revision"]),
            ).fetchone()
            self.assertEqual(claim["editorial_basis"]["reviewer_actor"], decision[0])
            self.assertFalse(claim["editorial_basis"]["user_factual_review_claimed"])
            self.assertFalse(claim["editorial_basis"]["native_reviewer_event"])
            self.assertTrue(all(self.store.cite(c) for c in claim["citations"]))
        scope = next(c["source_scope"] for c in rows if c["record_key"] == "N12")
        self.assertIn("MK2.5", scope)
        self.assertIn("MK3S+", scope)

    def test_replaying_guides_and_followup_seed_adds_no_review_events(self):
        before = self.store.stats()
        records, _ = prepare(self.store)
        self.assertEqual(self.store.ingest(records, actor=ACTOR)["skipped"], 3)
        docs, guides, entities, duplicates, _ = prepared_records(
            self.store, SEED.parent / "followup-catalogue-seed-v1.json"
        )
        self.assertTrue(
            all(not d["existing_other_identity_matches"] for d in duplicates)
        )
        for records in (docs, guides):
            self.assertEqual(
                self.store.ingest(records, local_references=entities)["skipped"], 2
            )
        self.assertEqual(self.store.stats(), before)

    def test_process_recipe_does_not_certify_parts_or_transfer_grades(self):
        for question, field in [
            (
                "Does annealing PA6-CF20 certify my bracket load rating?",
                "finished_part_load_rating",
            ),
            (
                "Can I transfer the PA6-CF20 annealing recipe to PA12?",
                "other_grade_process_transfer",
            ),
        ]:
            reply = Retriever(self.store).answer(question)
            self.assertEqual(reply["status"], "unknown")
            self.assertIn(field, reply["unknown_fields"])
            self.assertEqual(reply["context_pack"], [])
        known = Retriever(self.store).answer(
            "Does a 0.2 mm hardened nozzle meet PA6-CF20 minimum nozzle diameter?"
        )
        self.assertIn("does not meet", known["answer"])

    def test_supplier_family_table_cannot_become_exact_retailer_contents(self):
        known = Retriever(self.store).answer(
            "Compare 3DMakerParts supplier BOMs for Landy and Buggy/Buggster/Sandy"
        )
        self.assertEqual(
            {c["field"] for c in known["context_pack"]},
            {"family_belts", "family_shocks"},
        )
        self.assertTrue(
            all("not 3D Sets" in c["source_scope"] for c in known["context_pack"])
        )
        retailer = Retriever(self.store).answer(
            "Do exact DREMC WES2488 included parts guarantee 85 mm shocks for this model revision?"
        )
        self.assertEqual(retailer["status"], "unknown")
        self.assertIn("exact_model_release_compatibility", retailer["unknown_fields"])

    def test_prusa_article_does_not_establish_another_printer_variant(self):
        reply = Retriever(self.store).answer(
            "Does the PLA closed enclosure heat creep article apply to Prusa MK4?"
        )
        self.assertEqual(reply["status"], "unknown")
        self.assertIn("cross_printer_variant_applicability", reply["unknown_fields"])
        self.assertEqual(reply["context_pack"], [])

    def test_changed_source_cannot_supply_a_positive_guide(self):
        with patch.object(self.store, "cite", return_value=None):
            reply = Retriever(self.store).answer(
                "Is the fully closed enclosure relevant to PLA on Prusa MK3S?"
            )
        self.assertEqual(reply["status"], "unknown")
        self.assertEqual(reply["context_pack"], [])

    def test_specific_cm2_identity_wins_generic_hotend_alias_without_inventing_fit(
        self,
    ):
        known = Retriever(self.store).answer(
            "What is the hardened tip material of FlowTech CM2?"
        )
        self.assertEqual(known["group_key"], "catalogue_flowtech_cm2_04")
        self.assertIn("M2", known["answer"])
        unknown = Retriever(self.store).answer("Will M2904-04 fit a V6 hotend?")
        self.assertEqual(unknown["status"], "unknown")
        self.assertIn("other_nozzle_interface_fit", unknown["unknown_fields"])
        whole = Retriever(self.store).answer(
            "Does FlowTech CM2 raise the entire hotend temperature rating to 450C?"
        )
        self.assertEqual(whole["status"], "unknown")
        self.assertIn("whole_hotend_450c_capability", whole["unknown_fields"])

    def test_current_glue_family_does_not_bind_legacy_bottle_or_other_grade(self):
        for question, field in [
            (
                "Is my legacy Magigoo PP bottle the same formula as Glide PP?",
                "current_family_legacy_bottle_mapping",
            ),
            (
                "Does Magigoo PP have verified compatibility with Fiberlogy Graphite 750 g?",
                "exact_fiberlogy_grade_compatibility",
            ),
        ]:
            reply = Retriever(self.store).answer(question)
            self.assertEqual(reply["status"], "unknown")
            self.assertIn(field, reply["unknown_fields"])
        known = Retriever(self.store).answer(
            "What does DREMC warn about using Magigoo PP for PLA?"
        )
        self.assertIn("damage", known["answer"])


if __name__ == "__main__":
    unittest.main()
