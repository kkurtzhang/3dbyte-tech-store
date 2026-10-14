"""Finite v1 content/source boundaries and read-only native-preparation policies."""

import json
import unittest
from unittest.mock import patch
from activate_catalogue_references import SEED, prepared_records
from activate_v1_sheet_care import ACTOR, prepare
from local_store import ROOT, Store
from retrieval import Retriever


class V1CoverageTests(unittest.TestCase):
    def setUp(self):
        self.store = Store()

    def tearDown(self):
        self.store.close()

    def test_two_exact_material_refs_and_unknown_conflicts_are_persisted(self):
        for name, group in [
            ("Panchroma Basic PLA", "catalogue_panchroma_basic_black"),
            ("Polymaker PETG", "catalogue_polymaker_petg_black"),
        ]:
            answer = Retriever(self.store).answer(
                "What nozzle temperature range does " + name + " specify?"
            )
            self.assertEqual(answer["group_key"], group)
            self.assertEqual(answer["status"], "source_grounded_context")
            self.assertTrue(
                all(
                    self.store.cite(c)
                    for claim in answer["context_pack"]
                    for c in claim["citations"]
                )
            )
        bed = Retriever(self.store).answer(
            "What canonical bed temperature range does Panchroma Basic PLA specify?"
        )
        self.assertEqual(bed["status"], "unknown")
        self.assertIn("bed_temperature_c", bed["unknown_fields"])
        dry = Retriever(self.store).answer(
            "What canonical drying cycle does Polymaker PETG specify?"
        )
        self.assertEqual(dry["status"], "unknown")
        self.assertEqual(
            set(dry["unknown_fields"]),
            {"drying_temperature_c", "drying_duration_hours"},
        )

    def test_black_price_is_not_listing_minimum_or_live_offer(self):
        reference = Retriever(self.store).answer(
            "What dated reference AUD price was observed for Panchroma Basic PLA Black?"
        )
        self.assertIn("AUD22.95", reference["answer"])
        self.assertIn("minimum AUD21.95 is not", reference["answer"])
        current = Retriever(self.store).answer(
            "What is your current sale price for Panchroma Basic PLA?"
        )
        self.assertEqual(current["status"], "unknown")
        self.assertEqual(current["context_pack"], [])

    def test_sheet_care_excludes_comments_and_other_brands(self):
        known = Retriever(self.store).answer(
            "Can I clean Prusa satin or textured sheets with acetone?"
        )
        self.assertEqual(known["status"], "source_grounded_context")
        self.assertIn("prohibits acetone", known["answer"])
        for claim in known["context_pack"]:
            decision = self.store.db.execute(
                "SELECT actor FROM editorial_decisions WHERE record_id=? AND revision=? ORDER BY id DESC LIMIT 1",
                (claim["record_id"], claim["record_revision"]),
            ).fetchone()
            self.assertEqual(claim["editorial_basis"]["reviewer_actor"], decision[0])
        for claim in known["context_pack"]:
            for citation in claim["citations"]:
                self.assertIsNotNone(self.store.cite(citation))
                self.assertNotIn("I have", citation["quote"])
        other = Retriever(self.store).answer(
            "Does Prusa satin sheet cleaner advice apply to every other brand?"
        )
        self.assertEqual(other["status"], "unknown")
        self.assertIn("cross_brand_cleaner_compatibility", other["unknown_fields"])

    def test_symptom_and_unbound_grade_remain_stored_unknowns(self):
        symptom = Retriever(self.store).answer(
            "Does stringing prove that my filament is wet?"
        )
        self.assertEqual(symptom["status"], "unknown")
        self.assertIn("confirmed_moisture_fault", symptom["unknown_fields"])
        grade = Retriever(self.store).answer(
            "What drying temperature and cycle should I use for generic PLA of any brand?"
        )
        self.assertEqual(grade["status"], "unknown")
        self.assertIn("unbound_filament_drying_temperature_c", grade["unknown_fields"])
        self.assertEqual(grade["context_pack"], [])

    def test_changed_source_and_replay_do_not_grant_facts_or_new_reviews(self):
        with patch.object(self.store, "cite", return_value=None):
            answer = Retriever(self.store).answer(
                "Can I clean Prusa satin sheets with acetone?"
            )
        self.assertEqual(answer["status"], "unknown")
        self.assertEqual(answer["context_pack"], [])
        before = self.store.stats()
        docs, guides, entities, _, _ = prepared_records(
            self.store, SEED.parent / "v1-material-reference-seed-v1.json"
        )
        for records in (docs, guides):
            self.assertEqual(
                self.store.ingest(records, local_references=entities)["skipped"], 2
            )
        self.assertEqual(
            self.store.ingest([prepare(self.store)], actor=ACTOR)["skipped"], 1
        )
        self.assertEqual(self.store.stats(), before)

    def test_staged_manifest_does_not_fabricate_binding_or_approval(self):
        manifest = json.loads(
            (ROOT / "reports/v1-staged-import-preparation-manifest-v1.json").read_text()
        )
        self.assertFalse(manifest["native_apply_authorized"])
        self.assertEqual(manifest["native_import_eligible_count"], 0)
        self.assertEqual(len(manifest["reference_shell_plans"]), 33)
        self.assertEqual(len(manifest["single_source_candidate_fragments"]), 53)
        for item in manifest["single_source_candidate_fragments"]:
            self.assertIsNone(item["native_template"]["document_id"])
            self.assertIsNone(item["native_template"]["product_id"])
            self.assertIsNone(item["native_template"]["variant_id"])
            self.assertIsNone(item["native_revision_hash"])
            self.assertEqual(item["native_review"]["status"], "pending")
            self.assertFalse(item["is_public"])
        for shell in manifest["reference_shell_plans"]:
            self.assertIsNone(shell["native_product_id"])
            self.assertEqual(shell["policy"]["prices"], [])
            self.assertFalse(shell["policy"]["checkout_enabled"])
            self.assertFalse(shell["policy"]["simulation"]["real_stock"])
        self.assertTrue(
            any(
                item["kind"] == "editorial_guide" and not item["candidate_fragments"]
                for item in manifest["record_inventory"]
            )
        )


if __name__ == "__main__":
    unittest.main()
