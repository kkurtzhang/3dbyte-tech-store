"""Offline preparation must map real native shapes without granting native authority."""

import copy
import json
import unittest
from local_store import ROOT, Store
from prepare_import_readiness import build_readiness, reviewed_source_kind
from prepare_v1_import_manifest import build_manifest, source_kind


class ImportReadinessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = Store()
        cls.before = cls.store.stats()
        cls.plan = build_readiness(cls.store)

    @classmethod
    def tearDownClass(cls):
        assert cls.store.stats() == cls.before
        cls.store.close()

    def test_original_v1_builder_retains_53_fragments(self):
        original = json.loads(
            (ROOT / "reports/v1-staged-import-preparation-manifest-v1.json").read_text()
        )
        replay = build_manifest(self.store)
        for key in [
            "record_inventory",
            "single_source_candidate_fragments",
            "reference_shell_plans",
        ]:
            if key == "record_inventory":
                self.assertEqual(
                    [r for r in replay[key] if r["kind"] == "source_document"],
                    [r for r in original[key] if r["kind"] == "source_document"],
                )
            else:
                self.assertEqual(replay[key], original[key])

    def test_reviewed_product_sources_are_resolved_but_manual_and_image_scope_stays_held(
        self,
    ):
        for url in [
            "https://buildtak.com/products/buildtak-pei-3d-printing-surface",
            "https://fiberlogy.com/en/product/pp-filament/",
            "https://magigoo.com/products/magigoo-pp/",
            "https://www.orbiterprojects.com/orbiter-v2-5/",
            "https://mvip.creality.com/en/goods/goodsDetail/1945",
        ]:
            self.assertEqual(
                reviewed_source_kind({"source_url": url}, self.store),
                "official_product_page",
            )
        for url in [
            "https://wiki.creality.com/en/k2-flagship-series/k2-plus/parts-list",
            "https://www.orbiterprojects.com/unknown-manual/",
            "https://unrelated.example/product.pdf",
            "https://evilpolymaker.com/tds.pdf",
        ]:
            self.assertIsNone(reviewed_source_kind({"source_url": url}, self.store))
        self.assertIsNone(
            source_kind({"source_url": "https://evilpolymaker.com/tds.pdf"})
        )
        self.assertTrue(
            any(
                h["reason"]
                == "multi_source_claim_requires_single_source_native_curation"
                for r in self.plan["record_inventory"]
                for h in r["held_fields"]
            )
        )

    def test_cdn_datasheet_requires_verified_official_origin_bytes(self):
        url = "https://cdn.shopify.com/s/files/1/0548/7299/7945/files/PolyFlex_TPU95_HF_TDS_EN_V5.4.pdf"
        self.assertEqual(
            reviewed_source_kind({"source_url": url}, self.store), "official_datasheet"
        )
        from unittest.mock import patch

        with patch("prepare_import_readiness.origin_link_verified", return_value=False):
            self.assertIsNone(reviewed_source_kind({"source_url": url}, self.store))

    def test_partial_supported_content_and_real_local_review_events_are_preserved(self):
        entries = self.plan["single_source_candidate_fragments"]
        self.assertEqual(len(entries), 64)
        self.assertEqual(
            sum(
                f["value"] is not None
                for c in entries
                for f in c["native_template"]["facts"]
            ),
            155,
        )
        for candidate in entries:
            event = candidate["source_review"]["existing_local_event"]
            row = self.store.db.execute(
                "SELECT * FROM editorial_decisions WHERE id=?", (event["id"],)
            ).fetchone()
            self.assertEqual(event["actor"], row["actor"])
            self.assertEqual(row["revision"], candidate["local_record_revision"])
            self.assertEqual(row["decision"], "accepted_for_local_development")
            self.assertFalse(candidate["source_review"]["native_review_event"])
            self.assertTrue(
                any(
                    f["value"] is not None
                    for f in candidate["native_template"]["facts"]
                )
            )
            for fact in candidate["native_template"]["facts"]:
                if fact["value"] is None:
                    self.assertEqual(fact["evidence_excerpt"], "")
        self.assertEqual(self.plan["native_import_eligible_count"], 0)
        self.assertEqual(self.plan["local_stats"], self.before)

    def test_strapi_mapping_does_not_publish_or_reinterpret_body_version(self):
        for candidate in self.plan["single_source_candidate_fragments"]:
            record = candidate["strapi_record_template"]
            self.assertEqual(
                record["version"], candidate["native_template"]["source_version"]
            )
            self.assertEqual(record["knowledge_content"]["version"], 1)
            self.assertEqual(
                record["knowledge_content"]["facts"],
                candidate["native_template"]["facts"],
            )
            self.assertIn(record["document_type"], ["other", "datasheet"])
            self.assertIsNone(record["documentId"])
            self.assertIsNone(record["medusa_product_id"])
            self.assertIsNone(record["knowledge_content"]["variant_id"])
            self.assertEqual(record["knowledge_review"]["status"], "pending")
            self.assertFalse(record["is_public"])
            self.assertIsNone(record["publishedAt"])
            core = candidate["strapi_core_draft_data_template"]
            self.assertEqual(core["search_keywords"], [])
            self.assertNotIn("knowledge_content", core)
            self.assertEqual(
                candidate["strapi_admin_private_fields_after_native_binding"][
                    "knowledge_content"
                ],
                record["knowledge_content"],
            )
            self.assertNotIn("documentId", candidate["strapi_create_data_template"])
            self.assertNotIn("publishedAt", candidate["strapi_create_data_template"])

    def test_one_primary_per_product_and_common_fixture_ids_do_not_claim_native_binding(
        self,
    ):
        candidates = {
            c["candidate_key"]: c
            for c in self.plan["single_source_candidate_fragments"]
        }
        shells = self.plan["reference_shell_plans"]
        self.assertEqual(len(shells), 33)
        all_primary = []
        for shell in shells:
            key = shell["primary_candidate_key"]
            all_primary.append(key)
            primary = candidates[key]
            self.assertEqual(primary["local_group_key"], shell["local_group_key"])
            product_id = primary["structure_fixture_only"]["product_id"]
            for alt in shell["alternative_candidate_keys"]:
                self.assertEqual(
                    candidates[alt]["structure_fixture_only"]["product_id"], product_id
                )
                self.assertFalse(candidates[alt]["selected_for_reference_card"])
            self.assertIsNone(shell["native_product_id"])
            self.assertIsNone(shell["native_variant_id"])
            self.assertEqual(shell["medusa_create_data_template"]["status"], "draft")
            self.assertEqual(
                shell["medusa_create_data_template"]["variants"][0]["prices"], []
            )
            self.assertNotIn(
                "catalogue_simulation", shell["medusa_create_data_template"]["metadata"]
            )
        self.assertEqual(len(set(all_primary)), 33)
        build_again = build_readiness(self.store)
        self.assertEqual(
            [s["primary_candidate_key"] for s in build_again["reference_shell_plans"]],
            all_primary,
        )
        self.assertEqual(copy.deepcopy(self.before), self.store.stats())


if __name__ == "__main__":
    unittest.main()
