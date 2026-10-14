import hashlib
import sqlite3
import tempfile
import unittest
from pathlib import Path

from prepare_public_document_plan import build_plan, read_snapshot


class PublicDocumentPlanTests(unittest.TestCase):
    def fixture(self):
        return {
            "products": [
                {
                    "id": "local_product",
                    "group_key": "g1",
                    "payload": {
                        "title": "Maker Printer Kit A1234",
                        "listed_identity_evidence": {"manufacturer_sku": "A1234"},
                    },
                }
            ],
            "records": [
                {
                    "id": "local_doc",
                    "group_key": "g1",
                    "record_key": "g1_s1",
                    "kind": "source_document",
                    "revision": "local_revision",
                    "active": 1,
                    "title": "Reference",
                    "payload": {
                        "claims": [
                            {
                                "field": "fit",
                                "status": "unknown",
                                "value": None,
                                "citations": [],
                            }
                        ],
                        "native_approval": None,
                    },
                }
            ],
            "sources": [],
            "editorial_decisions": [
                {
                    "id": 7,
                    "record_id": "local_doc",
                    "revision": "local_revision",
                    "actor": "codex_local_review",
                    "scope": "local_development",
                    "decision": "accepted_for_local_development",
                    "decided_at": "2026-10-13T00:00:00Z",
                }
            ],
            "claims": [{"active": 1, "status": "unknown", "payload": {"value": None}}],
        }

    def test_historical_candidates_never_become_native_bindings_or_approvals(self):
        rows = [
            {
                "draft_id": "aipd_one",
                "name": "Maker Printer Kit A1234",
                "product_id": "prod_old",
                "soft_deleted": False,
            }
        ]
        plan = build_plan(
            self.fixture(),
            {"entries": [{"key": "g1", "counted": True}]},
            {"scope": {"captured_at_database": "2026-10-11"}, "rows": rows},
        )
        entry = plan["products"][0]
        self.assertEqual(
            entry["historical_identity_candidates"][0]["historical_product_id"],
            "prod_old",
        )
        self.assertIsNone(entry["native_binding"]["product_id"])
        self.assertFalse(plan["write_ready"])
        doc = plan["documents"][0]
        self.assertIsNone(doc["native_approval"])
        self.assertEqual(doc["local_review_events"][0]["actor"], "codex_local_review")
        self.assertEqual(doc["unknown_fields"], ["fit"])
        self.assertIn("genuine_native_revision_review", doc["gates"])

    def test_ambiguous_duplicates_deleted_rows_and_held_references_are_not_silently_imported(
        self,
    ):
        row = {
            "draft_id": "a1",
            "name": "Maker Printer Kit A1234",
            "soft_deleted": False,
        }
        rows = [
            row,
            {**row, "draft_id": "a2"},
            {**row, "draft_id": "deleted", "soft_deleted": True},
        ]
        p = build_plan(
            self.fixture(),
            {
                "entries": [
                    {"key": "g1", "counted": False, "reason": "Manufacturer conflict"}
                ]
            },
            {"rows": rows, "scope": {}},
        )
        entry = p["products"][0]
        self.assertEqual(entry["disposition"], "held")
        self.assertEqual(entry["identity_state"], "ambiguous_historical_candidates")
        self.assertEqual(len(entry["historical_identity_candidates"]), 2)
        self.assertEqual(p["documents"][0]["disposition"], "held")
        self.assertEqual(p["inventory"]["counted_references"], 0)

    def test_editorial_guides_remain_separate_from_factual_documents(self):
        data = self.fixture()
        data["records"][0]["kind"] = "editorial_guide"
        p = build_plan(
            data,
            {"entries": [{"key": "g1", "counted": True}]},
            {"rows": [], "scope": {}},
        )
        self.assertEqual(p["documents"][0]["disposition"], "editorial_review_only")
        self.assertIn(
            "official_source_or_two_independent_sources",
            p["review_policy"]["factual_evidence"],
        )

    def test_pinned_snapshot_is_read_only_and_hash_mismatch_fails_before_open(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "frozen.sqlite3"
            db = sqlite3.connect(path)
            for name in (
                "products",
                "records",
                "claims",
                "sources",
                "editorial_decisions",
            ):
                db.execute(f"CREATE TABLE {name} (id TEXT, payload TEXT)")
            db.commit()
            db.close()
            before = path.read_bytes()
            digest = hashlib.sha256(before).hexdigest()
            self.assertEqual(read_snapshot(path, digest)["records"], [])
            self.assertEqual(path.read_bytes(), before)
            self.assertFalse(Path(str(path) + "-wal").exists())
            with self.assertRaisesRegex(ValueError, "hash"):
                read_snapshot(path, "0" * 64)

    def test_ledger_candidate_keys_reconcile_through_explicit_group_keys(self):
        p = build_plan(
            self.fixture(),
            {"entries": [{"key": "candidate_g1", "group_key": "g1", "counted": True}]},
            {"rows": [], "scope": {}},
        )
        self.assertEqual(p["inventory"]["counted_references"], 1)
        self.assertEqual(p["inventory"]["held_references"], 0)

    def test_never_promotes_existing_local_native_ids(self):
        data = self.fixture()
        data["products"][0]["payload"]["staging_product_id"] = "unverified"
        data["records"][0]["payload"]["native_approval"] = {"status": "approved"}
        p = build_plan(
            data,
            {"entries": [{"key": "g1", "counted": True}]},
            {"rows": [], "scope": {}},
        )
        self.assertIsNone(p["products"][0]["native_binding"]["product_id"])
        self.assertIsNone(p["documents"][0]["native_approval"])


if __name__ == "__main__":
    unittest.main()
