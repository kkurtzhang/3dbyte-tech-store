"""Real local revisions must preserve old evidence, scope and honest review identity."""

import json
import unittest
from unittest.mock import patch
from local_store import ROOT, Store, digest
from activate_guide_citations import ACTOR, prepare_records


class GuideCitationActivationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = Store()
        cls.records, cls.sources, cls.audit = prepare_records(cls.store)

    @classmethod
    def tearDownClass(cls):
        cls.store.close()

    def test_all_guides_keep_conditions_and_separate_navigation(self):
        self.assertEqual(len(self.records), 29)
        self.assertEqual(
            sum(c["status"] != "unknown" for r in self.records for c in r["claims"]), 75
        )
        for record in self.records:
            self.assertEqual(record["factual_decision_basis"]["reviewer_actor"], ACTOR)
            self.assertFalse(
                record["factual_decision_basis"]["user_factual_review_claimed"]
            )
            self.assertFalse(record["factual_decision_basis"]["native_reviewer_event"])
            self.assertTrue(
                record["source_scope"].startswith("Original store guidance")
            )
            self.assertIsNone(record["native_approval"])
            self.assertIsNone(record["staging_native_id"])
            self.assertFalse(record["staging_export_allowed"])
            self.assertTrue(record["editorial_navigation"])
            self.assertTrue(
                all(
                    self.store.cite(c)
                    for claim in record["claims"]
                    for c in claim["citations"]
                )
            )

    def test_derived_versions_preserve_original_capture_dates_and_raw_hashes(self):
        derived = [s for s in self.sources if s.get("derived_from_local_source_id")]
        self.assertEqual(len(derived), 3)
        for source in derived:
            prior = json.loads(
                self.store.db.execute(
                    "SELECT payload FROM sources WHERE id=?",
                    (source["derived_from_local_source_id"],),
                ).fetchone()[0]
            )
            self.assertEqual(source["captured_at"], prior["captured_at"])
            self.assertEqual(source["sha256"], prior["sha256"])
            self.assertNotEqual(source["id"], prior["id"])
            self.assertNotEqual(source["text_sha256"], prior["text_sha256"])

    def test_selector_and_resistance_repair_citations_are_active_text_proofs(self):
        record = next(r for r in self.records if r["record_key"] == "G04")
        sizes = next(c for c in record["claims"] if c["field"] == "k2_nozzle_sizes")
        for sku in ["4008030090", "4008030074", "4008030073", "4008030091"]:
            self.assertTrue(
                any(
                    sku in c["quote"] and self.store.cite(c) for c in sizes["citations"]
                )
            )
        resistance = next(c for c in record["claims"] if c["field"] == "k2_resistance")
        self.assertTrue(any("350°C" in c["quote"] for c in resistance["citations"]))
        self.assertTrue(any("300°C" in c["quote"] for c in resistance["citations"]))
        self.assertTrue(any("unknown" in c["text"].lower() for c in record["claims"]))

    def test_replay_is_idempotent_and_prior_baseline_cannot_revert_repairs(self):
        before = self.store.stats()
        self.assertEqual(self.store.ingest(self.records, actor=ACTOR)["skipped"], 29)
        for record in self.records:
            baseline = self.audit["baseline_records"][record["record_key"]]
            self.assertEqual(self.store.ingest([baseline])["skipped"], 1)
            current = self.store.db.execute(
                "SELECT revision FROM records WHERE record_key=?",
                (record["record_key"],),
            ).fetchone()[0]
            self.assertEqual(current, digest(record))
        self.assertEqual(self.store.stats(), before)

    def test_missing_evidence_fails_before_review_or_record_mutation(self):
        before = self.store.stats()
        with patch.object(self.store, "cite", return_value=None):
            with self.assertRaises(ValueError):
                prepare_records(self.store)
        self.assertEqual(self.store.stats(), before)

    def test_equivalent_sources_keep_publisher_and_measurement_conditions(self):
        from prepare_guide_equivalents import build

        report = build(self.store)
        self.assertEqual(report["exact_official_equivalents"], 2)
        self.assertEqual(report["qualified_or_existing_supplier_corroborations"], 6)
        self.assertFalse(report["source_form_policy_changed"])
        self.assertFalse(report["supplier_source_independence_established"])
        self.assertTrue(
            all(not r["independent_corroboration_claimed"] for r in report["rows"])
        )
        self.assertTrue(
            all(not r["original_source_relabelled"] for r in report["rows"])
        )
        dimensions = next(
            r
            for r in report["rows"]
            if r["original_field"] == "manufacturer_adapter_dimensions"
        )
        self.assertIn("approximate", dimensions["condition"])
        self.assertEqual(dimensions["equivalent_origin"], "supplier_product_page")
        image = next(
            r for r in report["rows"] if r["original_field"] == "component_materials"
        )
        self.assertEqual(
            image["search_disposition"], "held_no_complete_allowed_text_equivalent"
        )
        self.assertTrue(
            all(self.store.cite(c) for r in report["rows"] for c in r["citations"])
        )

    def test_supplier_newline_normalization_keeps_capture_history(self):
        from prepare_guide_equivalents import build
        import hashlib
        from pathlib import Path

        build(self.store)
        sources = [
            json.loads(r[0])
            for r in self.store.db.execute("SELECT payload FROM sources")
        ]
        normalized = [
            s
            for s in sources
            if s.get("derivation", {}).get("kind") == "text_newline_normalization"
        ]
        captures = json.loads(
            (ROOT / "reports/guide-equivalent-supplier-captures-v1.json").read_text()
        )
        needs_normalization = {
            source["id"]
            for source in captures
            if source.get("id")
            and hashlib.sha256(
                Path(source["text_path"]).read_text().encode()
            ).hexdigest()
            != source["text_sha256"]
        }
        self.assertEqual(
            {source["derived_from_local_source_id"] for source in normalized},
            needs_normalization,
        )
        self.assertEqual(len(needs_normalization), 1)
        for source in normalized:
            prior = json.loads(
                self.store.db.execute(
                    "SELECT payload FROM sources WHERE id=?",
                    (source["derived_from_local_source_id"],),
                ).fetchone()[0]
            )
            self.assertEqual(source["captured_at"], prior["captured_at"])
            self.assertEqual(source["sha256"], prior["sha256"])
            self.assertEqual(
                hashlib.sha256(Path(prior["text_path"]).read_bytes()).hexdigest(),
                prior["text_sha256"],
            )
            self.assertEqual(
                hashlib.sha256(
                    Path(source["text_path"]).read_text().encode()
                ).hexdigest(),
                source["text_sha256"],
            )

    def test_frozen_scope_check_rejects_changed_claims_or_conditions(self):
        import copy

        record = self.records[0]
        row = dict(
            self.store.db.execute(
                "SELECT revision,payload FROM records WHERE record_key=?",
                (record["record_key"],),
            ).fetchone()
        )
        baseline = record["citation_repair"]["baseline_revision"]
        self.assertTrue(self.store.verified_citation_repair(row, baseline))
        changed = copy.deepcopy(record)
        changed["claims"][0]["label"] = "Unsupported fit guarantee"
        row["payload"] = json.dumps(changed)
        self.assertFalse(self.store.verified_citation_repair(row, baseline))
        changed = copy.deepcopy(record)
        changed["source_scope"] = "Any printer, material or version"
        row["payload"] = json.dumps(changed)
        self.assertFalse(self.store.verified_citation_repair(row, baseline))

    def test_new_real_local_events_and_old_revisions_are_retained(self):
        for record in self.records:
            revision = digest(record)
            row = self.store.db.execute(
                "SELECT * FROM editorial_decisions WHERE record_id=? AND revision=? ORDER BY id DESC LIMIT 1",
                (record["id"], revision),
            ).fetchone()
            self.assertEqual(row["actor"], ACTOR)
            self.assertEqual(row["decision"], "accepted_for_local_development")
            evidence = json.loads(row["evidence"])
            self.assertFalse(evidence["native_reviewer_event"])
            baseline = record["citation_repair"]["baseline_revision"]
            self.assertIsNotNone(
                self.store.db.execute(
                    "SELECT id FROM revisions WHERE record_id=? AND revision=?",
                    (record["id"], baseline),
                ).fetchone()
            )


if __name__ == "__main__":
    unittest.main()
