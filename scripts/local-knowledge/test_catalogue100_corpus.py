"""Corpus-wide acceptance checks for the separate 100-product SSD knowledge base."""

import hashlib
import json
import sqlite3
import unittest
from pathlib import Path
from unittest.mock import patch
from activate_catalogue100 import ACTOR, load_ledger, validate_entries, seed_paths
from activate_price_followup import ACTOR as PRICE_ACTOR
from catalogue_reference import catalogue_groups
from local_store import ROOT, Store
from retrieval import Retriever

SEEDS = seed_paths()


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
        packet = Path(__file__).parent / "evaluation/price-followup-reviewed-v2.json"
        cls.price_reviews = {
            item["key"]: item for item in json.loads(packet.read_text())["observations"]
        }

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
                record = json.loads(
                    self.store.db.execute(
                        "SELECT payload FROM records WHERE group_key=?",
                        ("catalogue_c100_" + e["key"],),
                    ).fetchone()[0]
                )
                if record.get("price_observations"):
                    reviewed = self.price_reviews[e["key"]]
                    self.assertEqual(
                        record["price_observations"],
                        [
                            {
                                **reviewed,
                                "prior_record_revision": reviewed[
                                    "expected_prior_revision"
                                ],
                            }
                        ],
                    )
                    has_price = (
                        reviewed["classification"] != "retailer_identity_unresolved"
                    )
                    if has_price:
                        self.assertIn(reviewed["statement"], result["answer"])
                self.assertEqual(
                    result["status"],
                    "source_grounded_context" if has_price else "unknown",
                )
                if has_price:
                    self.assertTrue(
                        "not a live" in result["answer"]
                        or "No live 3D Byte" in result["answer"]
                    )
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
            actor = ACTOR
            if record.get("price_observations"):
                actor = PRICE_ACTOR
                reviewed = self.price_reviews[
                    row["group_key"].removeprefix("catalogue_c100_")
                ]
                historical = self.store.db.execute(
                    "SELECT payload FROM revisions WHERE record_id=? AND revision=?",
                    (row["id"], reviewed["expected_prior_revision"]),
                ).fetchone()
                self.assertIsNotNone(historical)
                prior = json.loads(historical[0])["factual_decision_basis"]
                self.assertEqual(basis["prior_factual_basis"], prior)
                self.assertEqual(prior["reviewer_actor"], ACTOR)
                previous_review = self.store.db.execute(
                    "SELECT actor,decision FROM editorial_decisions WHERE record_id=? AND revision=?",
                    (row["id"], reviewed["expected_prior_revision"]),
                ).fetchone()
                self.assertEqual(
                    tuple(previous_review), (ACTOR, "accepted_for_local_development")
                )
            self.assertEqual(basis["reviewer_actor"], actor)
            self.assertFalse(basis["user_factual_review_claimed"])
            self.assertFalse(basis["native_reviewer_event"])
            self.assertIsNone(record["staging_native_id"])
            self.assertIsNone(record["native_approval"])
            self.assertFalse(record["staging_export_allowed"])
            review = self.store.db.execute(
                "SELECT actor,decision FROM editorial_decisions WHERE record_id=? AND revision=? ORDER BY id DESC",
                (row["id"], row["revision"]),
            ).fetchone()
            self.assertEqual(tuple(review), (actor, "accepted_for_local_development"))
        self.assertEqual(self.store.stats()["native_approvals"], 0)

    def test_baseline_records_sources_and_reviews_preserved(self):
        receipt = json.loads(
            (
                Path(__file__).parent / "evaluation/catalogue100-receipt-v1.json"
            ).read_text()
        )
        pin = receipt["preservation"]["original_v1_snapshot"]
        self.assertEqual(
            hashlib.sha256(Path(pin["path"]).read_bytes()).hexdigest(), pin["sha256"]
        )
        original = sqlite3.connect(
            "file:" + pin["path"] + "?mode=ro&immutable=1", uri=True
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
                    if table == "sources":
                        local = self.store.db.execute(
                            "SELECT * FROM sources WHERE id=?", (row["id"],)
                        ).fetchone()
                        self.assertIsNotNone(local)
                        self.assertEqual(tuple(row)[:-1], tuple(local)[:-1])
                        historical, relocated = (
                            json.loads(row["payload"]),
                            json.loads(local["payload"]),
                        )
                        for field in ("raw_path", "text_path"):
                            historical.pop(field)
                            relocated.pop(field)
                        self.assertEqual(historical, relocated)
                    else:
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

    def test_held_and_adjacent_identities_cannot_fall_back_to_unrelated_guides(self):
        for name in (
            "Fiberlogy PA12 unfilled",
            "3DLAC Plus 100 mL",
            "BIGTREETECH Eddy USB",
            "E3D Revo Prusa Mini coldside",
        ):
            with self.subTest(name=name):
                result = self.retriever.answer(
                    "What specifications are recorded for " + name + "?"
                )
                self.assertEqual(result["status"], "unknown")
                self.assertEqual(result["context_pack"], [])
                self.assertEqual(result["hits"], [])

    def test_cosmetic_options_do_not_split_functional_identity(self):
        cases = {
            "Fiberlogy PCTG+CF10 black 1.75 mm 1 kg": "fiberlogy_pctgcf",
            "Fiberlogy PCTG+GF10 blue 2.85 mm": "fiberlogy_pctggf",
            "Fiberlogy Easy ABS transparent 750 g": "fiberlogy_easyabs",
            "Fiberlogy ABS black 1.75 mm": "fiberlogy_abs",
            "colorFabb TPU 85A orange 750 g": "colorfabb_tpu85a",
            "colorFabb TPU 95A black 1 kg": "colorfabb_tpu95a",
            "Bondtech CHT MK8 coated brass nozzle 0.6 mm": "bondtech_cht_mk8",
            "Bondtech CHT Volcano coated brass nozzle 0.4 mm": "bondtech_cht_volcano",
            "Magigoo PA adhesive 120 mL": "magigoo_pa",
        }
        for name, key in cases.items():
            with self.subTest(name=name):
                self.assertEqual(
                    catalogue_groups(name, self.store), ["catalogue_c100_" + key]
                )

    def test_explicit_wrong_identity_does_not_override_named_product(self):
        result = self.retriever.answer(
            "What specifications are recorded for Magigoo Original adhesive?",
            group_key="catalogue_c100_magigoo_pc",
        )
        self.assertEqual(result["status"], "unknown")
        self.assertEqual(result["context_pack"], [])


if __name__ == "__main__":
    unittest.main()
