"""Dated prices cannot change identities, manufacture live offers, or lose history."""

import copy
import unittest
from unittest.mock import patch

from activate_price_followup import prepare_record, validate_observation
from local_store import Store
from retrieval import Retriever

EXPECTED = [
    ("sunlu_s2", "SUNLU S2", "149.00"),
    ("cnc_ts100", "CNC Kitchen TS100", "47.95"),
    ("creality_spacepi_x4", "Creality SpacePi X4", "269.00"),
    ("btt_ebb36_gen2", "EBB36 Gen 2", "65.65"),
    ("e3d_revo_six_cold", "Revo Six coldside", "69.90"),
    ("fiberlogy_asa", "Fiberlogy ASA", "61.15"),
    ("fiberlogy_fiberflex30d", "FiberFlex 30D", "83.60"),
    ("fiberlogy_easyabs", "Easy ABS", "41.00"),
    ("pythonflex98a", "PythonFlex 98A", "69.99"),
    ("aquasolve_pva", "AquaSolve PVA", "72.99"),
    ("eibos_polyphemus", "EIBOS Polyphemus", "231.00"),
    ("btt_sfs_v2", "SFS V2.0", "33.45"),
]


class PriceFollowupTests(unittest.TestCase):
    def setUp(self):
        self.observation = dict(
            key="sunlu_s2",
            amount_aud="149.00",
            currency="AUD",
            classification="dated_current_page",
            observed_date="2026-10-13",
            statement="Dated external reference: AUD 149.00; no live store offer.",
            evidence={"price": [{}], "identity": [{}], "currency_tax": [{}]},
        )
        self.record = dict(
            group_key="catalogue_c100_sunlu_s2",
            claims=[
                dict(
                    field="specification",
                    status="supported",
                    value="70C",
                    citations=["old"],
                ),
                dict(
                    field="dated_reference_price",
                    status="unknown",
                    value=None,
                    citations=[],
                ),
                dict(
                    field="store_sale_price", status="unknown", value=None, citations=[]
                ),
            ],
            explicit_unknowns={"dated_reference_price": None, "store_sale_price": None},
            factual_decision_basis={"original": True},
            local_product_id="keep",
            local_variant_id="keep",
        )

    def test_price_only_revision_is_immutable_transform(self):
        prior = copy.deepcopy(self.record)
        result = prepare_record(self.record, self.observation, "prior-sha")
        self.assertEqual(self.record, prior)
        for field in ["specification", "store_sale_price"]:
            self.assertEqual(
                next(c for c in result["claims"] if c["field"] == field),
                next(c for c in prior["claims"] if c["field"] == field),
            )
        self.assertEqual(result["local_product_id"], "keep")
        self.assertEqual(
            result["price_observations"][0]["prior_record_revision"], "prior-sha"
        )
        self.assertFalse(
            result["factual_decision_basis"]["user_factual_review_claimed"]
        )

    def test_identity_mismatch_is_quarantined(self):
        observation = {
            **self.observation,
            "classification": "retailer_identity_unresolved",
        }
        result = prepare_record(self.record, observation, "old")
        self.assertEqual(result["claims"], self.record["claims"])
        self.assertEqual(result["explicit_unknowns"], self.record["explicit_unknowns"])

    def test_historical_observation_requires_crawl_age(self):
        observation = {**self.observation, "classification": "historical_only"}
        with self.assertRaises(ValueError):
            validate_observation(observation)
        observation["provider_reported_crawl"] = "last month"
        validate_observation(observation)
        result = prepare_record(self.record, observation, "old")
        self.assertTrue(
            any(
                c["field"] == "current_external_reference_price"
                and c["status"] == "unknown"
                for c in result["claims"]
            )
        )

    def test_unsupported_amount_currency_evidence_and_identity_rejected(self):
        for change in [
            dict(amount_aud="0"),
            dict(currency="USD"),
            dict(classification="live_offer"),
            dict(evidence={}),
            dict(observed_date="tomorrow"),
        ]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_observation({**self.observation, **change})
        with self.assertRaises(ValueError):
            prepare_record(self.record, {**self.observation, "key": "another"}, "old")

    def test_repeat_observation_is_rejected(self):
        result = prepare_record(self.record, self.observation, "old")
        with self.assertRaises(ValueError):
            prepare_record(result, self.observation, "new")


class PersistedPriceTests(unittest.TestCase):
    def setUp(self):
        self.store = Store()

    def tearDown(self):
        self.store.close()

    def test_exact_dated_prices_and_citations(self):
        for key, name, amount in EXPECTED:
            with self.subTest(key=key):
                result = Retriever(self.store).answer(
                    "What is the dated reference price for " + name + "?"
                )
                self.assertEqual(result["status"], "source_grounded_context")
                claim = next(
                    c
                    for c in result["context_pack"]
                    if c["field"] == "dated_reference_price"
                )
                self.assertEqual(claim["group_key"], "catalogue_c100_" + key)
                self.assertIn("AUD " + amount, claim["statement"])
                self.assertIn("2026-10-13", claim["statement"])
                self.assertTrue(all(self.store.cite(c) for c in claim["citations"]))
                if key in ["eibos_polyphemus", "btt_sfs_v2"]:
                    self.assertIn("Historical cached", claim["statement"])
                    self.assertIn(
                        "Current external price is unknown", claim["statement"]
                    )

    def test_live_commerce_and_historical_current_prices_are_unknown(self):
        for _, name, _ in EXPECTED:
            for suffix in ["current price", "physical stock"]:
                with self.subTest(name=name, suffix=suffix):
                    result = Retriever(self.store).answer(name + " " + suffix)
                    self.assertEqual(result["status"], "unknown")
                    self.assertEqual(result["context_pack"], [])
        for key in ["eibos_polyphemus", "btt_sfs_v2"]:
            result = Retriever(self.store).answer(
                "current dated reference price", "catalogue_c100_" + key
            )
            self.assertEqual(result["status"], "unknown")
            self.assertIn("current_external_reference_price", result["unknown_fields"])

    def test_unresolved_identities_and_tampered_evidence_are_not_prices(self):
        for key in ["cnc_deburrer", "printdry_fc305"]:
            result = Retriever(self.store).answer(
                "dated reference price", "catalogue_c100_" + key
            )
            self.assertEqual(result["status"], "unknown")
            self.assertIn("dated_reference_price", result["unknown_fields"])
        result = Retriever(self.store).answer(
            "dated reference price", "catalogue_c100_pythonflex98a"
        )
        claim = result["context_pack"][0]
        self.assertNotIn("19.99", claim["statement"])
        bad = {**claim["citations"][0], "quote": "19.99"}
        self.assertIsNone(self.store.cite(bad))
        with patch.object(self.store, "cite", return_value=None):
            result = Retriever(self.store).answer(
                "dated reference price", "catalogue_c100_pythonflex98a"
            )
        self.assertEqual(result["status"], "unknown")


if __name__ == "__main__":
    unittest.main()
