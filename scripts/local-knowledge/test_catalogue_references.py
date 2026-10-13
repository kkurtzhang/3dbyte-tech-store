"""Persisted scope, source integrity, review honesty and replay checks for new references."""

import copy
import json
import unittest
from unittest.mock import patch
from activate_catalogue_references import ACTOR, SEED, prepared_records
from catalogue_reference import catalogue_groups
from local_store import Store
from retrieval import Retriever


class CatalogueReferenceTests(unittest.TestCase):
    def setUp(self):
        self.store = Store()

    def tearDown(self):
        self.store.close()

    def test_new_rows_have_real_local_bindings_and_honest_review(self):
        original_groups = {
            entry["key"] for entry in json.loads(SEED.read_text())["entries"]
        }
        rows = [
            json.loads(r["payload"])
            for r in self.store.rows()
            if json.loads(r["payload"]).get("group_key") in original_groups
        ]
        self.assertEqual(len(rows), 80)
        self.assertEqual(sum(c["status"] == "supported" for c in rows), 32)
        self.assertEqual(sum(c["status"] == "unknown" for c in rows), 42)
        self.assertEqual(sum(c["status"] == "editorial_inference" for c in rows), 6)
        for claim in rows:
            self.assertFalse(claim["editorial_basis"]["user_factual_review_claimed"])
            self.assertFalse(claim["editorial_basis"]["native_reviewer_event"])
            if claim["status"] == "unknown":
                self.assertIsNone(claim["value"])
                self.assertEqual(claim["citations"], [])
            else:
                self.assertTrue(all(self.store.cite(c) for c in claim["citations"]))
            binding = self.store.db.execute(
                "SELECT * FROM local_record_bindings WHERE record_id=?",
                (claim["record_id"],),
            ).fetchone()
            self.assertEqual(binding["product_id"], claim["local_product_id"])
            decision = self.store.db.execute(
                "SELECT actor,decision FROM editorial_decisions WHERE record_id=? ORDER BY id DESC",
                (claim["record_id"],),
            ).fetchone()
            self.assertEqual(tuple(decision), (ACTOR, "accepted_for_local_development"))

    def test_replay_does_not_duplicate_identity_or_review_events(self):
        before = self.store.stats()
        docs, guides, entities, duplicates, _ = prepared_records(self.store)
        self.assertTrue(
            all(not x["existing_other_identity_matches"] for x in duplicates)
        )
        for records in (docs, guides):
            result = self.store.ingest(records, actor=ACTOR, local_references=entities)
            self.assertEqual(result["skipped"], 6)
            self.assertEqual(result["created"], 0)
        self.assertEqual(self.store.stats(), before)

    def test_unrelated_material_query_excludes_new_catalogue(self):
        for mode in ("keyword", "vector", "hybrid"):
            hits = Retriever(self.store).search(
                "What are the outdoor properties of ASA?", mode=mode
            )["hits"]
            self.assertTrue(
                all(
                    not (h.get("group_key") or "").startswith("catalogue_")
                    for h in hits
                )
            )

    def test_changed_excerpt_and_unavailable_source_never_yield_positive_answer(self):
        answer = Retriever(self.store).answer(
            "What wattage is the FlowTech M3101 heater?"
        )
        citation = copy.deepcopy(answer["context_pack"][0]["citations"][0])
        citation["quote"] += " invented"
        self.assertIsNone(self.store.cite(citation))
        with patch.object(self.store, "cite", return_value=None):
            invalid = Retriever(self.store).answer(
                "What wattage is the FlowTech M3101 heater?"
            )
        self.assertEqual(invalid["status"], "unknown")
        self.assertEqual(invalid["context_pack"], [])

    def test_dated_aud_observation_does_not_answer_live_offer(self):
        for name in (
            "FlowTech M3101",
            "Orbiter v2.5",
            "Slice torque wrench",
            "BuildTak PEI",
            "BuildTak Spatula",
            "Fiberlogy PP",
        ):
            reference = Retriever(self.store).answer(
                "What dated reference AUD price was observed for " + name + "?"
            )
            self.assertEqual(reference["status"], "source_grounded_context")
            self.assertIn("not a live", reference["answer"])
            current = Retriever(self.store).answer(
                "What is your current sale price for " + name + "?"
            )
            self.assertEqual(current["status"], "unknown")
            self.assertIn("store_sale_price", current["unknown_fields"])
            stock = Retriever(self.store).answer("Is " + name + " in stock?")
            self.assertEqual(stock["status"], "unknown")
            self.assertEqual(stock["context_pack"], [])

    def test_explicit_group_cannot_override_a_different_named_identity(self):
        other_groups = catalogue_groups("Orbiter v2.5", self.store)
        self.assertEqual(len(other_groups), 1)
        reply = Retriever(self.store).answer(
            "What voltage is the FlowTech M3101 heater?",
            group_key=other_groups[0],
        )
        self.assertEqual(reply["status"], "unknown")
        self.assertEqual(reply["reason"], "catalogue_reference_scope_mismatch")
        self.assertEqual(reply["context_pack"], [])

    def test_comparison_requires_scope_and_family_recipe_does_not_bind_legacy(self):
        question = "Compare BuildTak PEI with BuildTak Spatula"
        self.assertEqual(len(catalogue_groups(question, self.store)), 2)
        result = Retriever(self.store).answer(question)
        self.assertEqual(result["status"], "unknown")
        self.assertEqual(result["context_pack"], [])
        legacy = Retriever(self.store).answer(
            "Apply current Fiberlogy PP drying settings to the legacy 750 g spool?"
        )
        self.assertEqual(legacy["status"], "unknown")
        self.assertIn("legacy_spool_settings_applicability", legacy["unknown_fields"])


if __name__ == "__main__":
    unittest.main()
