"""Corpus-wide acceptance checks for the separate 100-product SSD knowledge base."""

import hashlib
import json
import sqlite3
import unittest
from pathlib import Path
from unittest.mock import patch
from activate_catalogue100 import ACTOR, load_ledger, validate_entries
from catalogue_reference import catalogue_groups
from local_store import ROOT, Store
from retrieval import Retriever

SEEDS = sorted((Path(__file__).parent / "evaluation").glob("catalogue100-*.json"))


@unittest.skipUnless(
    ROOT.name.endswith("catalogue100"), "Requires the separate expansion corpus"
)
class Catalogue100CorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = Store()
        cls.retriever = Retriever(cls.store)
        cls.ledger = load_ledger()
        cls.entries = [e for p in SEEDS for e in json.loads(p.read_text())["entries"]]

    @classmethod
    def tearDownClass(cls):
        cls.store.close()

    def test_exact_canonical_goal_excludes_pending_kits_and_cosmetics(self):
        entries = self.ledger["entries"]
        self.assertEqual(sum(e["counted"] for e in entries), 100)
        self.assertEqual(len(entries), 103)
        self.assertEqual(len({e["canonical_key"] for e in entries}), 103)
        self.assertEqual(
            sum(e["status"] == "legacy_kit_original_brand_pending" for e in entries), 3
        )
        self.assertEqual(len(self.entries), 70)
        self.assertEqual(self.store.stats()["products"], 103)
        for e in self.entries:
            self.assertNotIn(
                e["brand"].lower().replace(" ", ""),
                {"dremc", "proforged3d", "west3d", "x3d"},
            )

    def test_every_new_identity_routes_and_answers_from_its_own_record(self):
        for e in self.entries:
            q = (
                (
                    "What bed temperature is listed for "
                    if e["key"]
                    in {
                        "fiberlogy_abs",
                        "fiberlogy_absgf",
                        "fiberlogy_asa",
                        "fiberlogy_pctg",
                        "fiberlogy_pctgcf",
                        "fiberlogy_pctggf",
                    }
                    else "What specifications are recorded for "
                )
                + e["title"]
                + "?"
            )
            group = "catalogue_c100_" + e["key"]
            with self.subTest(product=e["key"]):
                self.assertEqual(catalogue_groups(q, self.store), [group])
                answer = self.retriever.answer(q)
                self.assertEqual(answer["status"], "source_grounded_context")
                self.assertTrue(answer["context_pack"])
                self.assertEqual(
                    {c["group_key"] for c in answer["context_pack"]}, {group}
                )

    def test_all_live_price_and_stock_questions_stay_unknown(self):
        for e in self.entries:
            for question in (
                "What is your current sale price for ",
                "Is this in physical stock: ",
            ):
                with self.subTest(product=e["key"], question=question):
                    result = self.retriever.answer(question + e["title"] + "?")
                    self.assertEqual(result["status"], "unknown")
                    self.assertEqual(result["context_pack"], [])

    def test_dated_prices_use_the_right_product_and_unknown_prices_remain_unknown(self):
        for e in self.entries:
            with self.subTest(product=e["key"]):
                result = self.retriever.answer(
                    "What dated reference AUD price was observed for "
                    + e["title"]
                    + "?"
                )
                has_price = any(
                    f["field"] == "dated_reference_price" for f in e["facts"]
                )
                self.assertEqual(
                    result["status"],
                    "source_grounded_context" if has_price else "unknown",
                )
                if has_price:
                    self.assertIn("not a live", result["answer"])
                    self.assertEqual(
                        {c["group_key"] for c in result["context_pack"]},
                        {"catalogue_c100_" + e["key"]},
                    )

    def test_all_active_citations_are_byte_verified_and_unknowns_null(self):
        count = 0
        for row in self.store.rows():
            claim = json.loads(row["payload"])
            if claim["status"] == "unknown":
                self.assertIsNone(claim["value"])
                self.assertEqual(claim["citations"], [])
            else:
                self.assertTrue(claim["citations"])
                for citation in claim["citations"]:
                    self.assertTrue(self.store.cite(citation))
                    count += 1
        self.assertGreater(count, 400)

    def test_all_registered_source_versions_match_original_bytes(self):
        for row in self.store.db.execute("SELECT payload FROM sources"):
            source = json.loads(row[0])
            if source.get("raw_capture_available") is False:
                self.assertFalse(source["id"].startswith("local_source_c100_"))
                for active in self.store.rows():
                    self.assertNotIn(
                        source["id"],
                        [
                            c["local_source_id"]
                            for c in json.loads(active["payload"])["citations"]
                        ],
                    )
                continue
            for path, sha in [("raw_path", "sha256"), ("text_path", "text_sha256")]:
                with self.subTest(source=source["id"], kind=path):
                    self.assertEqual(
                        hashlib.sha256(Path(source[path]).read_bytes()).hexdigest(),
                        source[sha],
                    )

    def test_new_records_have_actual_local_reviews_and_no_native_approval(self):
        for row in self.store.db.execute(
            "SELECT * FROM records WHERE group_key LIKE 'catalogue_c100_%'"
        ):
            record = json.loads(row["payload"])
            basis = record["factual_decision_basis"]
            self.assertEqual(basis["reviewer_actor"], ACTOR)
            self.assertFalse(basis["user_factual_review_claimed"])
            self.assertFalse(basis["native_reviewer_event"])
            self.assertIsNone(record["staging_native_id"])
            self.assertIsNone(record["native_approval"])
            self.assertFalse(record["staging_export_allowed"])
            review = self.store.db.execute(
                "SELECT actor,decision FROM editorial_decisions WHERE record_id=? AND revision=? ORDER BY id DESC",
                (row["id"], row["revision"]),
            ).fetchone()
            self.assertEqual(tuple(review), (ACTOR, "accepted_for_local_development"))
        self.assertEqual(self.store.stats()["native_approvals"], 0)

    def test_baseline_records_sources_and_reviews_preserved(self):
        original = sqlite3.connect(
            ROOT.parent
            / "20261013/exports/guide-citation-final-local-snapshot-v1.sqlite3"
        )
        original.row_factory = sqlite3.Row
        try:
            for table in [
                "records",
                "sources",
                "products",
                "local_reference_variants",
                "editorial_decisions",
                "revisions",
            ]:
                rows = original.execute("SELECT * FROM " + table).fetchall()
                current = {
                    tuple(row)
                    for row in self.store.db.execute("SELECT * FROM " + table)
                }
                for row in rows:
                    self.assertIn(tuple(row), current, table)
        finally:
            original.close()

    def test_replay_is_rejected_before_any_ingest_or_new_review(self):
        before = self.store.stats()
        for e in self.entries:
            with self.assertRaises(ValueError):
                validate_entries([e], self.ledger)
        self.assertEqual(self.store.stats(), before)

    def test_corrupt_or_missing_source_cannot_answer(self):
        with patch.object(self.store, "cite", return_value=None):
            answer = self.retriever.answer(
                "What specifications are recorded for BIGTREETECH SKR Mini E3 V3.0?"
            )
        self.assertEqual(answer["status"], "unknown")
        self.assertEqual(answer["context_pack"], [])

    def test_nearby_unverified_models_cannot_inherit_reference_facts(self):
        for name in (
            "EBB SB2209 RP2040",
            "colorFabb varioShore TPU Prosthetic",
            "Bondtech LGX Lite V2 mirrored",
            "SKR Mini E3 V3.0.1",
        ):
            with self.subTest(name=name):
                result = self.retriever.answer(
                    "What specifications are recorded for " + name + "?"
                )
                self.assertEqual(result["status"], "unknown")
                self.assertEqual(result["context_pack"], [])

    def test_explicit_wrong_identity_does_not_override_named_product(self):
        result = self.retriever.answer(
            "What specifications are recorded for Magigoo Original adhesive?",
            group_key="catalogue_c100_magigoo_pc",
        )
        self.assertEqual(result["status"], "unknown")
        self.assertEqual(result["context_pack"], [])


if __name__ == "__main__":
    unittest.main()
