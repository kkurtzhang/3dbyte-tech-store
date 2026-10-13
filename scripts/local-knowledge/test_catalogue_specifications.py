"""Generic manufacturer-spec requests must stay inside persisted reference evidence."""

import unittest
from unittest.mock import patch

from local_store import Store
from retrieval import Retriever

FAMILIES = (
    ("fiberlogy_abs", "Fiberlogy ABS"),
    ("fiberlogy_absgf", "Fiberlogy ABS+GF"),
    ("fiberlogy_asa", "Fiberlogy ASA"),
    ("fiberlogy_pctg", "Fiberlogy PCTG"),
    ("fiberlogy_pctgcf", "Fiberlogy PCTG+CF10"),
    ("fiberlogy_pctggf", "Fiberlogy PCTG+GF10"),
)


class CatalogueSpecificationsTests(unittest.TestCase):
    def setUp(self):
        self.store = Store()

    def tearDown(self):
        self.store.close()

    def test_generic_specs_return_only_supported_manufacturer_fields(self):
        for key, name in FAMILIES:
            for wording in ["specifications", "specs", "technical details"]:
                with self.subTest(product=name, wording=wording):
                    group = "catalogue_c100_" + key
                    result = Retriever(self.store).answer(
                        "What are the recorded reference "
                        + wording
                        + " for "
                        + name
                        + "?",
                        group,
                    )
                    self.assertEqual(result["status"], "source_grounded_context")
                    self.assertEqual(
                        {claim["field"] for claim in result["context_pack"]},
                        {
                            "manufacturer_print_temperature",
                            "manufacturer_bed_temperature",
                        },
                    )
                    for claim in result["context_pack"]:
                        self.assertEqual(claim["group_key"], group)
                        self.assertEqual(claim["status"], "supported")
                        self.assertTrue(claim["citations"])
                        self.assertTrue(
                            all(self.store.cite(c) for c in claim["citations"])
                        )

    def test_unverified_details_remain_unknown_with_truthful_reference_scope(self):
        result = Retriever(self.store).answer(
            "What is the tensile strength of Fiberlogy ASA?"
        )
        self.assertEqual(result["status"], "unknown")
        self.assertEqual(result["context_pack"], [])
        self.assertEqual(result["reason"], "catalogue_question_unresolved")
        self.assertNotIn("not registered", result["answer"])

    def test_generic_specs_do_not_override_price_stock_or_received_spool_unknowns(self):
        for suffix in [
            "and its current price",
            "and is it in stock",
            "for my received spool",
        ]:
            with self.subTest(suffix=suffix):
                result = Retriever(self.store).answer(
                    "Fiberlogy ASA specifications " + suffix
                )
                self.assertEqual(result["status"], "unknown")
                self.assertEqual(result["context_pack"], [])

    def test_generic_specs_keep_citation_integrity_required(self):
        with patch.object(self.store, "cite", return_value=None):
            result = Retriever(self.store).answer("Fiberlogy ASA specifications")
        self.assertEqual(result["status"], "unknown")
        self.assertEqual(result["context_pack"], [])
        self.assertEqual(result["reason"], "catalogue_source_invalid")

    def test_wrong_explicit_group_cannot_borrow_fiberlogy_evidence(self):
        result = Retriever(self.store).answer(
            "Fiberlogy ASA specifications", "catalogue_magigoo_pp50"
        )
        self.assertEqual(result["status"], "unknown")
        self.assertEqual(result["reason"], "catalogue_reference_scope_mismatch")
        self.assertEqual(result["context_pack"], [])


if __name__ == "__main__":
    unittest.main()
