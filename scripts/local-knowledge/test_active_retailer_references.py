"""Actual persisted source/review/lookup guards after local retailer activation."""

import copy
import json
import unittest

from activate_retailer_references import ACTOR, prepared_records
from local_store import Store
from prepare_kit_reference_plan import build_plan
from retrieval import Retriever
from verify_retailer_kit_evidence import REVIEW


class ActiveRetailerTests(unittest.TestCase):
    def setUp(self):
        self.store = Store()

    def tearDown(self):
        self.store.close()

    def test_actual_bindings_review_and_all_facts_remain_honest(self):
        rows = [
            json.loads(row["payload"])
            for row in self.store.rows()
            if (json.loads(row["payload"]).get("group_key") or "").startswith(
                "retailer_dremc_"
            )
        ]
        self.assertEqual(sum(x["status"] == "supported" for x in rows), 21)
        self.assertEqual(sum(x["status"] == "unknown" for x in rows), 33)
        for claim in rows:
            self.assertFalse(claim["editorial_basis"]["user_factual_review_claimed"])
            for citation in claim["citations"]:
                self.assertIsNotNone(self.store.cite(citation))
            binding = self.store.db.execute(
                "SELECT * FROM local_record_bindings WHERE record_id=?",
                (claim["record_id"],),
            ).fetchone()
            self.assertEqual(binding["product_id"], claim["local_product_id"])
            decision = self.store.db.execute(
                "SELECT actor,scope,decision FROM editorial_decisions WHERE record_id=? ORDER BY id DESC",
                (claim["record_id"],),
            ).fetchone()
            self.assertEqual(
                tuple(decision),
                (ACTOR, "local_development", "accepted_for_local_development"),
            )

    def test_exact_contents_unknown_while_shared_exclusions_are_supported(self):
        retriever = Retriever(self.store)
        unknown = retriever.answer("What exact parts are included in DREMC WES2487?")
        self.assertEqual(unknown["status"], "unknown")
        self.assertIn("exact_kit_included_contents", unknown["unknown_fields"])
        known = retriever.answer("What do I need to buy separately for DREMC WES2487?")
        self.assertEqual(known["status"], "source_grounded_context")
        self.assertEqual(len(known["context_pack"]), 2)
        self.assertTrue(
            all(
                "DREMC external retailer" in claim["source_scope"]
                for claim in known["context_pack"]
            )
        )

    def test_retailer_rows_do_not_enter_unrelated_material_retrieval(self):
        hits = Retriever(self.store).search("How do I dry PA6-CF20?", mode="hybrid")[
            "hits"
        ]
        self.assertTrue(
            all(
                not (claim.get("group_key") or "").startswith("retailer_dremc_")
                for claim in hits
            )
        )

    def test_own_store_price_connector_and_version_are_not_promoted(self):
        for question, field in [
            ("Does our store kit WES2487 include STLs?", "store_kit_sku"),
            ("What is the price of WES2487?", "physical_stock"),
            ("Does WES2488 use XT60?", "esc_battery_connector_type"),
            (
                "Which exact model version fits WES2489?",
                "exact_model_release_compatibility",
            ),
        ]:
            result = Retriever(self.store).answer(question)
            self.assertEqual(result["status"], "unknown")
            self.assertIn(field, result["unknown_fields"])

    def test_unknown_reference_group_is_safe(self):
        result = Retriever(self.store).answer(
            "Tell me about this reference", group_key="retailer_dremc_missing"
        )
        self.assertEqual(result["reason"], "retailer_reference_unavailable")

    def test_replay_preserves_records_and_editorial_decisions(self):
        plan = build_plan(json.loads(REVIEW.read_text()))
        records, entities = prepared_records(self.store, plan)
        before = self.store.stats()
        result = self.store.ingest(records, actor=ACTOR, local_references=entities)
        self.assertEqual(result["skipped"], 3)
        self.assertEqual(self.store.stats(), before)

    def test_invalid_record_rolls_back_new_reference_grouping_rows(self):
        plan = build_plan(json.loads(REVIEW.read_text()))
        records, entities = prepared_records(self.store, plan)
        record = copy.deepcopy(records[0])
        entity = copy.deepcopy(entities[0])
        group = "retailer_dremc_atomic_test"
        record.update(
            id="local_dev_document_atomic_test",
            record_key=group,
            group_key=group,
            local_product_id="local_dev_product_atomic_test",
            local_variant_id="local_dev_variant_atomic_test",
            staging_export_allowed=True,
        )
        entity["product"].update(id=record["local_product_id"], group_key=group)
        entity["variant"].update(
            id=record["local_variant_id"],
            product_id=record["local_product_id"],
            group_key=group,
        )
        before = self.store.stats()
        with self.assertRaises(AssertionError):
            self.store.ingest([record], actor=ACTOR, local_references=[entity])
        self.assertEqual(self.store.stats(), before)
        self.assertIsNone(
            self.store.db.execute(
                "SELECT id FROM products WHERE group_key=?", (group,)
            ).fetchone()
        )


if __name__ == "__main__":
    unittest.main()
