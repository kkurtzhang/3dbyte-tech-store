"""Meaningful duplicate, evidence and commerce-boundary checks for expansion batches."""

import copy
import unittest
from activate_catalogue100 import validate_entries
from catalogue100_capture import allowed_url


class Catalogue100ValidationTests(unittest.TestCase):
    def setUp(self):
        self.entry = dict(
            key="example",
            canonical_key="brand:grade",
            brand="Original Manufacturer",
            manufacturer_product_url="https://fiberlogy.com/en/product/example/",
            distinctness_reason="Distinct functional grade.",
            facts=[
                {"proofs": [{"source_key": "official", "quote": "Exact grade"}]},
                {"proofs": [{"source_key": "official", "quote": "Exact condition"}]},
            ],
        )
        self.ledger = {"entries": []}

    def test_accepts_distinct_original_brand(self):
        validate_entries([self.entry], self.ledger)

    def test_rejects_replayed_identity_with_new_label(self):
        self.ledger["entries"] = [self.entry]
        duplicate = copy.deepcopy(self.entry)
        duplicate["key"] = "new_colour"
        with self.assertRaises(ValueError):
            validate_entries([duplicate], self.ledger)

    def test_rejects_same_page_cosmetic_relabel(self):
        self.ledger["entries"] = [self.entry]
        duplicate = copy.deepcopy(self.entry)
        duplicate.update(key="new_colour", canonical_key="brand:grade-red")
        with self.assertRaises(ValueError):
            validate_entries([duplicate], self.ledger)

    def test_rejects_duplicate_within_batch(self):
        with self.assertRaises(ValueError):
            validate_entries([self.entry, self.entry], self.ledger)

    def test_rejects_own_brand(self):
        for brand in ("DREMC", "West3D", "ProForged 3D", "X3D"):
            with self.subTest(brand=brand):
                candidate = {**self.entry, "brand": brand}
                with self.assertRaises(ValueError):
                    validate_entries([candidate], self.ledger)

    def test_rejects_missing_exact_evidence(self):
        candidate = copy.deepcopy(self.entry)
        candidate["facts"][0]["proofs"] = []
        with self.assertRaises(ValueError):
            validate_entries([candidate], self.ledger)

    def test_public_capture_rejects_credentials_non_https_and_unapproved_hosts(self):
        for url in (
            "http://fiberlogy.com/a",
            "https://user:password@fiberlogy.com/a",
            "https://localhost/a",
            "https://3dsets.com/build-guide/foo",
            "https://3dsets.com/faq/foo",
        ):
            self.assertFalse(allowed_url(url), url)
        self.assertTrue(
            allowed_url("https://fiberlogy.com/en/product/abs-filament-s1/")
        )


if __name__ == "__main__":
    unittest.main()
