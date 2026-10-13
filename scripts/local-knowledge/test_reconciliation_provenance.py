"""Combined worktrees must retain their own review events without changing evidence gates."""

import copy
import unittest
from pathlib import Path
from unittest.mock import patch
from local_store import ROOT, Store
from prepare_import_readiness import build_readiness
from reconcile_evidence import build_reconciliation


class ReconciliationProvenanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = Store()
        cls.before = cls.store.stats()
        cls.report = build_reconciliation(cls.store)

    @classmethod
    def tearDownClass(cls):
        assert cls.store.stats() == cls.before
        cls.store.close()

    def test_prepared_plan_uses_current_local_review_events_and_paths(self):
        plan = self.report["prepared_native_plan"]
        for candidate in plan["single_source_candidate_fragments"]:
            event = candidate["source_review"]["existing_local_event"]
            row = self.store.db.execute(
                "SELECT * FROM editorial_decisions WHERE id=?", (event["id"],)
            ).fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["record_id"], candidate["local_record_id"])
            self.assertEqual(row["revision"], candidate["local_record_revision"])
            for field, value in event.items():
                self.assertEqual(row[field], value)
            for field in ("raw_path", "text_path"):
                self.assertTrue(
                    Path(candidate["source_sidecar"][field]).is_relative_to(
                        ROOT / "sources"
                    )
                )
        self.assertEqual(plan["local_stats"], self.before)

    def test_new_fragment_reviews_only_its_own_projected_facts(self):
        candidates = self.report["prepared_native_plan"][
            "single_source_candidate_fragments"
        ]
        self.assertEqual(
            sum(len(c.get("derived_preparation_review", [])) for c in candidates), 7
        )
        for candidate in candidates:
            fields = {f["field"] for f in candidate["native_template"]["facts"]}
            proofs = {
                p["field"]: p["citations"]
                for p in candidate["source_sidecar"]["field_proofs"]
            }
            for review in candidate.get("derived_preparation_review", []):
                self.assertIn(review["field"], fields)
                self.assertEqual(
                    {p["local_source_id"] for p in proofs[review["field"]]},
                    {candidate["source_sidecar"]["local_source_id"]},
                )
                self.assertFalse(review["native_review_event"])

    def test_rebuilt_evidence_drift_is_rejected(self):
        changed = copy.deepcopy(build_readiness(self.store))
        facts = changed["single_source_candidate_fragments"][0]["native_template"][
            "facts"
        ]
        fact = next(f for f in facts if f["value"] is not None)
        fact["value"] += " unsupported change"
        with patch("reconcile_evidence.build_readiness", return_value=changed):
            with self.assertRaisesRegex(ValueError, "differs from pinned"):
                build_reconciliation(self.store)

    def test_rebuilt_permission_drift_is_rejected(self):
        changed = copy.deepcopy(build_readiness(self.store))
        changed["single_source_candidate_fragments"][0]["apply_authorized"] = True
        with patch("reconcile_evidence.build_readiness", return_value=changed):
            with self.assertRaisesRegex(ValueError, "differs from pinned"):
                build_reconciliation(self.store)

    def test_diagram_inspection_is_attributed_to_prior_source_review(self):
        visual = self.report["diagram_origin_and_visual_review"]
        self.assertEqual(visual["inspection_scope"], "prior_source_milestone_review")
        self.assertFalse(visual["fresh_visual_inspection_claimed"])
        self.assertNotIn("viewed in this task", visual["inspection"])
        self.assertIsNone(visual["native_source_kind"])


if __name__ == "__main__":
    unittest.main()
