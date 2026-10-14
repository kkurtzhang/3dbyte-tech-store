"""Persistent preparation regressions; native metadata is synthetic and unapproved."""

import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location(
    "durable", ROOT / "synchronize_documents.py"
)
MODULE = None
if SPEC and SPEC.origin and Path(SPEC.origin).exists():
    MODULE = importlib.util.module_from_spec(SPEC)
    SPEC.loader.exec_module(MODULE)


class DurableSyncTest(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(MODULE, "Durable coordinator has not been implemented")
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.database = self.root / "state.sqlite3"
        self.store = MODULE.DocumentStore(self.database)
        self.manifest = self.make_manifest(["A", "B"])

    def tearDown(self):
        if hasattr(self, "store"):
            self.store.close()
        if hasattr(self, "directory"):
            self.directory.cleanup()

    def make_manifest(self, names, time="2026-10-10T10:00:00Z"):
        manifest = {
            "version": 1,
            "fixture_only": True,
            "snapshot_complete": True,
            "captured_at": time,
            "scope_document_ids": [],
            "documents": [],
            "artifacts": [],
        }
        for name in names:
            doc = "fixture_doc_" + name
            url = "https://manufacturer.example/" + name
            data = f"Model: Vega {name}\nRated power: 73 W\n".encode()
            (self.root / (doc + ".txt")).write_bytes(data)
            sha = hashlib.sha256(data).hexdigest()
            manifest["scope_document_ids"].append(doc)
            manifest["documents"].append(
                {
                    "documentId": doc,
                    "medusa_product_id": "fixture_prod_" + name,
                    "product_handle": name,
                    "product_title": "Vega " + name,
                    "title": "Source " + name,
                    "version": "fixture-v1",
                    "source_kind": "official_product_page",
                    "source_url": url,
                    "source_checked_at": time,
                    "is_public": True,
                    "publishedAt": time,
                    "updatedAt": time,
                    "file": {"url": url, "mime": "text/plain"},
                }
            )
            manifest["artifacts"].append(
                {
                    "document_id": doc,
                    "path": doc + ".txt",
                    "sha256": sha,
                    "origin_url": url,
                    "source_provenance": {
                        "capture_kind": "original_response",
                        "capture_sha256": sha,
                        "response_sha256": sha,
                        "captured_at": time,
                        "final_url": url,
                        "derivation": "Synthetic original response fixture",
                    },
                }
            )
        return manifest

    def current(self):
        return self.store.review_snapshot()["entries"]

    def test_restart_retains_chunks_and_identical_retry_is_noop(self):
        first = self.store.sync(self.manifest, self.root)
        chunks = copy.deepcopy(self.current())
        self.store.close()
        self.store = MODULE.DocumentStore(self.database)
        retry = self.store.sync(self.manifest, self.root)
        self.assertTrue(retry["already_applied"])
        self.assertEqual(first["run_id"], retry["run_id"])
        self.assertEqual(self.current(), chunks)
        self.assertEqual(len(self.store.events()), 2)
        self.assertTrue(all(e["retrieval_eligible"] is False for e in self.current()))

    def test_scoped_withdrawal_preserves_other_docs_history_and_capture_bytes(self):
        self.store.sync(self.manifest, self.root)
        before = {e["document_id"]: e for e in self.current()}
        changed = copy.deepcopy(self.manifest)
        changed.update(
            captured_at="2026-10-10T11:00:00Z",
            scope_document_ids=["fixture_doc_A"],
            documents=[],
            artifacts=[],
        )
        result = self.store.sync(changed, self.root)
        self.assertEqual(result["withdrawn_chunks"], 1)
        after = {e["document_id"]: e for e in self.current()}
        self.assertEqual(after["fixture_doc_A"]["status"], "withdrawn")
        self.assertEqual(after["fixture_doc_B"], before["fixture_doc_B"])
        old = before["fixture_doc_A"]["chunks"][0]
        with self.assertRaises(ValueError):
            self.store.quote_citation(old["id"], "73 W")
        self.assertEqual(
            self.store.capture_bytes(old["citation"]["source_sha256"]),
            (self.root / "fixture_doc_A.txt").read_bytes(),
        )
        self.assertEqual(self.store.stats()["historical_chunks"], 2)

    def test_source_revision_replaces_chunks_without_reusing_old_quotes(self):
        self.store.sync(self.manifest, self.root)
        old = self.current()[0]["chunks"][0]
        changed = copy.deepcopy(self.manifest)
        changed["captured_at"] = "2026-10-10T11:00:00Z"
        data = b"Model: Vega A\nRated power: 91 W\n"
        (self.root / "fixture_doc_A.txt").write_bytes(data)
        digest = hashlib.sha256(data).hexdigest()
        artifact = changed["artifacts"][0]
        artifact["sha256"] = digest
        artifact["source_provenance"].update(
            capture_sha256=digest, response_sha256=digest
        )
        result = self.store.sync(changed, self.root)
        self.assertEqual(result["withdrawn_chunks"], 1)
        self.assertEqual(result["added_chunks"], 1)
        with self.assertRaises(ValueError):
            self.store.quote_citation(old["id"], "73 W")
        fresh = self.current()[0]["chunks"][0]
        citation = self.store.quote_citation(fresh["id"], "91 W")
        self.assertEqual(citation["source_sha256"], digest)
        self.assertFalse(citation["retrieval_eligible"])

    def test_missing_capture_withdraws_old_chunks_and_can_retry_after_repair(self):
        self.store.sync(self.manifest, self.root)
        changed = copy.deepcopy(self.manifest)
        changed["captured_at"] = "2026-10-10T11:00:00Z"
        artifact = changed["artifacts"][0]
        artifact["path"] = "repaired.txt"
        result = self.store.sync(changed, self.root)
        self.assertEqual(result["failed_documents"], 1)
        self.assertEqual(result["withdrawn_chunks"], 1)
        (self.root / "repaired.txt").write_bytes(
            (self.root / "fixture_doc_A.txt").read_bytes()
        )
        result = self.store.sync(changed, self.root)
        self.assertFalse(result["already_applied"])
        self.assertEqual(result["failed_documents"], 0)

    def test_invalid_manifest_rolls_back_the_whole_scope(self):
        self.store.sync(self.manifest, self.root)
        before = self.store.stats()
        changed = copy.deepcopy(self.manifest)
        changed["documents"][1]["medusa_product_id"] = "bad id"
        with self.assertRaises(ValueError):
            self.store.sync(changed, self.root)
        self.assertEqual(self.store.stats(), before)

    def test_stale_or_equal_time_conflicting_snapshot_cannot_resurrect_withdrawal(self):
        self.store.sync(self.manifest, self.root)
        changed = copy.deepcopy(self.manifest)
        changed.update(captured_at="2026-10-10T11:00:00Z", documents=[], artifacts=[])
        self.store.sync(changed, self.root)
        with self.assertRaises(ValueError):
            self.store.sync(self.manifest, self.root)
        self.manifest["captured_at"] = "2026-10-10T11:00:00Z"
        with self.assertRaises(ValueError):
            self.store.sync(self.manifest, self.root)
        self.assertTrue(all(e["status"] == "withdrawn" for e in self.current()))

    def test_derived_text_without_original_bytes_is_not_original_page_proof(self):
        artifact = self.manifest["artifacts"][0]
        artifact["source_provenance"].update(
            capture_kind="derived_source_text",
            response_sha256="1" * 64,
            derivation="HTML main text transformed; original response absent",
        )
        self.store.sync(self.manifest, self.root)
        citation = self.store.quote_citation(
            self.current()[0]["chunks"][0]["id"], "73 W"
        )
        self.assertEqual(citation["capture_kind"], "derived_source_text")
        self.assertFalse(citation["original_response_archived"])
        self.assertEqual(citation["offset_basis"], "normalized_extracted_page")

    def test_derived_text_with_original_response_archives_both_digests(self):
        response = b"<main><p>Model: Vega A</p><p>Rated power: 73 W</p></main>"
        (self.root / "response.txt").write_bytes(response)
        provenance = self.manifest["artifacts"][0]["source_provenance"]
        provenance.update(
            capture_kind="derived_source_text",
            response_path="response.txt",
            response_sha256=hashlib.sha256(response).hexdigest(),
            derivation="Synthetic HTML conversion",
        )
        self.store.sync(self.manifest, self.root)
        citation = self.store.quote_citation(
            self.current()[0]["chunks"][0]["id"], "73 W"
        )
        self.assertTrue(citation["original_response_archived"])
        self.assertEqual(
            self.store.capture_bytes(citation["response_sha256"]), response
        )

    def test_bad_provenance_rolls_back_instead_of_claiming_original_capture(self):
        for change in [
            {"capture_sha256": "0" * 64},
            {"capture_kind": "original_response", "response_sha256": "0" * 64},
            {"capture_kind": "invented"},
        ]:
            manifest = copy.deepcopy(self.manifest)
            manifest["artifacts"][0]["source_provenance"].update(change)
            with self.assertRaises(ValueError):
                self.store.sync(manifest, self.root)
            self.assertEqual(self.store.stats()["runs"], 0)

    def test_raw_capture_corruption_invalidates_citation(self):
        self.store.sync(self.manifest, self.root)
        chunk = self.current()[0]["chunks"][0]
        self.store.connection.execute(
            "UPDATE captures SET data=? WHERE sha256=?",
            (b"corrupt", chunk["citation"]["source_sha256"]),
        )
        with self.assertRaises(ValueError):
            self.store.quote_citation(chunk["id"], "73 W")

    def test_private_or_approval_fields_are_not_persisted_or_promoted(self):
        for document in self.manifest["documents"]:
            document["knowledge_review"] = {
                "status": "approved",
                "reviewed_by": "synthetic-negative-test",
            }
            document["private_note"] = "must not be copied"
        self.store.sync(self.manifest, self.root)
        text = json.dumps(self.store.review_snapshot())
        self.assertNotIn("private_note", text)
        self.assertNotIn("reviewed_by", text)
        self.assertEqual(self.store.stats()["retrieval_eligible_chunks"], 0)

    def test_more_than_one_hundred_documents_persist_across_bounded_batches(self):
        for start in (0, 60):
            manifest = self.make_manifest([str(n) for n in range(start, start + 60)])
            self.store.sync(manifest, self.root)
        self.assertEqual(self.store.stats()["documents"], 120)
        self.assertEqual(self.store.stats()["active_review_chunks"], 120)
        with self.assertRaises(ValueError):
            self.store.sync(self.make_manifest([str(n) for n in range(101)]), self.root)

    def test_crash_before_commit_rolls_back_and_retry_is_safe(self):
        self.store.sync(self.manifest, self.root)
        before = self.store.stats()
        changed = copy.deepcopy(self.manifest)
        changed.update(captured_at="2026-10-10T11:00:00Z", documents=[], artifacts=[])
        path = self.root / "changed.json"
        path.write_text(json.dumps(changed))
        script = """import importlib.util,json,os,sqlite3,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location("crash_store",sys.argv[1]); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
class Crash(sqlite3.Connection):
 def execute(self,sql,*args):
  if sql.startswith("INSERT INTO chunk_events"): os._exit(73)
  return super().execute(sql,*args)
store=m.DocumentStore(Path(sys.argv[2])); store.connection.close(); store.connection=sqlite3.connect(sys.argv[2],isolation_level=None,factory=Crash)
store.connection.row_factory=sqlite3.Row
store.sync(json.loads(Path(sys.argv[3]).read_text()),Path(sys.argv[3]).parent)
"""
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                script,
                str(ROOT / "synchronize_documents.py"),
                str(self.database),
                str(path),
            ]
        )
        self.assertEqual(result.returncode, 73)
        self.assertEqual(self.store.stats(), before)
        self.assertEqual(self.store.sync(changed, self.root)["withdrawn_chunks"], 2)

    def test_multi_chunk_page_offsets_and_exact_quote_are_preserved(self):
        data = ("x" * 1700 + " Exact source quotation.\fSecond page.").encode()
        path = self.root / "fixture_doc_A.txt"
        path.write_bytes(data)
        digest = hashlib.sha256(data).hexdigest()
        artifact = self.manifest["artifacts"][0]
        artifact["sha256"] = digest
        artifact["source_provenance"].update(
            capture_sha256=digest, response_sha256=digest
        )
        self.store.sync(self.manifest, self.root)
        chunks = self.current()[0]["chunks"]
        self.assertEqual(len(chunks), 3)
        citation = self.store.quote_citation(chunks[1]["id"], "Exact source quotation.")
        self.assertEqual(citation["page"], 1)
        self.assertEqual(citation["start_char"], 1701)
        with self.assertRaises(ValueError):
            self.store.quote_citation(chunks[1]["id"], "invented quotation")

    def test_archive_source_can_be_unbound_and_events_are_restartable(self):
        artifact = self.manifest["artifacts"][0]
        source = self.store.archive_source(artifact, self.root)
        self.assertTrue(source["original_response_archived"])
        self.assertEqual(self.store.stats()["documents"], 0)
        self.store.sync(self.manifest, self.root)
        events = self.store.events()
        self.assertEqual(self.store.events(after=events[0]["event_id"]), events[1:])
        with self.assertRaises(ValueError):
            self.store.events(limit=1001)

    def test_provenance_only_revision_retires_prior_citation(self):
        self.manifest["artifacts"][0]["source_provenance"].update(
            capture_kind="derived_source_text", response_sha256="1" * 64
        )
        self.store.sync(self.manifest, self.root)
        old = self.current()[0]["chunks"][0]
        changed = copy.deepcopy(self.manifest)
        changed["captured_at"] = "2026-10-10T11:00:00Z"
        raw = b"<main>Rated power: 73 W</main>"
        (self.root / "original.txt").write_bytes(raw)
        changed["artifacts"][0]["source_provenance"].update(
            response_path="original.txt",
            response_sha256=hashlib.sha256(raw).hexdigest(),
        )
        result = self.store.sync(changed, self.root)
        self.assertEqual(result["withdrawn_chunks"], 1)
        self.assertEqual(result["added_chunks"], 1)
        with self.assertRaises(ValueError):
            self.store.quote_citation(old["id"], "73 W")
        self.assertTrue(
            self.current()[0]["chunks"][0]["citation"]["original_response_archived"]
        )

    def test_new_snapshot_without_content_change_emits_no_chunk_events(self):
        self.store.sync(self.manifest, self.root)
        changed = copy.deepcopy(self.manifest)
        changed["captured_at"] = "2026-10-10T11:00:00Z"
        result = self.store.sync(changed, self.root)
        self.assertEqual(result["withdrawn_chunks"], 0)
        self.assertEqual(result["added_chunks"], 0)
        self.assertEqual(len(self.store.events()), 2)

    def test_unknown_capture_provenance_is_explicit_and_not_promoted(self):
        del self.manifest["artifacts"][0]["source_provenance"]
        self.store.sync(self.manifest, self.root)
        citation = self.store.quote_citation(
            self.current()[0]["chunks"][0]["id"], "73 W"
        )
        self.assertEqual(citation["capture_kind"], "unclassified_capture")
        self.assertFalse(citation["original_response_archived"])
        self.assertFalse(citation["source_authority_verified"])

    def test_invalid_provenance_and_unbound_archive_are_atomic(self):
        changes = [
            {"response_sha256": "bad"},
            {"captured_at": "bad"},
            {"final_url": "http://example.test"},
            {"derivation": ""},
            {"response_path": "missing.txt", "response_sha256": None},
        ]
        for change in changes:
            artifact = copy.deepcopy(self.manifest["artifacts"][0])
            artifact["source_provenance"].update(change)
            with self.assertRaises((ValueError, OSError)):
                self.store.archive_source(artifact, self.root)
            self.assertEqual(self.store.stats()["archived_captures"], 0)
        artifact = copy.deepcopy(self.manifest["artifacts"][0])
        artifact["source_provenance"] = []
        with self.assertRaises(ValueError):
            self.store.archive_source(artifact, self.root)

    def test_quote_and_cursor_bounds_and_unrelated_databases_are_rejected(self):
        self.store.sync(self.manifest, self.root)
        chunk = self.current()[0]["chunks"][0]
        for quote in ("", None, "x" * 1601):
            with self.assertRaises(ValueError):
                self.store.quote_citation(chunk["id"], quote)
        for after, limit in ((True, 10), (-1, 10), (0, False), (0, 0)):
            with self.assertRaises(ValueError):
                self.store.events(after, limit)
        with self.assertRaises(ValueError):
            self.store.capture_bytes("0" * 64)
        unrelated = self.root / "unrelated.sqlite3"
        connection = sqlite3.connect(unrelated)
        connection.execute("CREATE TABLE unrelated(x)")
        connection.close()
        with self.assertRaises(ValueError):
            MODULE.DocumentStore(unrelated)
        connection = sqlite3.connect(unrelated)
        connection.execute("PRAGMA user_version=1")
        connection.close()
        with self.assertRaises(ValueError):
            MODULE.DocumentStore(unrelated)
        connection = sqlite3.connect(unrelated)
        connection.execute("PRAGMA user_version=7")
        connection.close()
        with self.assertRaises(ValueError):
            MODULE.DocumentStore(unrelated)
        link = self.root / "symlink.sqlite3"
        link.symlink_to(unrelated)
        with self.assertRaises(ValueError):
            MODULE.DocumentStore(link)

    def test_archived_original_response_corruption_and_quote_text_tamper_rejected(self):
        self.store.sync(self.manifest, self.root)
        chunk = self.current()[0]["chunks"][0]
        payload = copy.deepcopy(chunk)
        payload["text"] = "forged"
        self.store.connection.execute(
            "UPDATE chunks SET payload_json=? WHERE chunk_id=?",
            (json.dumps(payload), chunk["id"]),
        )
        with self.assertRaises(ValueError):
            self.store.quote_citation(chunk["id"], "forged")

    def test_command_line_applies_only_local_state(self):
        path = self.root / "manifest.json"
        path.write_text(json.dumps(self.manifest))
        completed = subprocess.run(
            [
                sys.executable,
                "-B",
                str(ROOT / "synchronize_documents.py"),
                str(self.database),
                str(path),
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        summary = json.loads(completed.stdout)
        self.assertTrue(summary["locally_applied"])
        self.assertFalse(summary["native_applied"])

    def test_image_transcription_basis_retains_separate_digest_and_bytes(self):
        image = b"synthetic image bytes"
        (self.root / "image-body.txt").write_bytes(image)
        image_sha = hashlib.sha256(image).hexdigest()
        source = {
            "url": "https://manufacturer.example/spec.jpg",
            "sha256": image_sha,
            "role": "image_transcription_basis",
            "path": "image-body.txt",
        }
        self.manifest["artifacts"][0]["source_provenance"]["supporting_sources"] = [
            source
        ]
        self.store.sync(self.manifest, self.root)
        chunk = self.current()[0]["chunks"][0]
        citation = self.store.quote_citation(chunk["id"], "73 W")
        self.assertTrue(citation["supporting_sources"][0]["archived"])
        self.assertFalse(citation["derivation_verified"])
        self.store.connection.execute(
            "UPDATE captures SET data=? WHERE sha256=?", (b"corrupt", image_sha)
        )
        with self.assertRaises(ValueError):
            self.store.quote_citation(chunk["id"], "73 W")

    def test_supporting_source_without_bytes_remains_unarchived_and_malformed_rejected(
        self,
    ):
        artifact = copy.deepcopy(self.manifest["artifacts"][0])
        source = {
            "url": "https://manufacturer.example/spec.jpg",
            "sha256": "1" * 64,
            "role": "image_transcription_basis",
        }
        artifact["source_provenance"]["supporting_sources"] = [source]
        self.assertFalse(
            self.store.archive_source(artifact, self.root)["supporting_sources"][0][
                "archived"
            ]
        )
        for sources in (None, [{}], list(range(9)), [{**source, "role": ""}]):
            artifact["source_provenance"]["supporting_sources"] = sources
            with self.assertRaises(ValueError):
                self.store.archive_source(artifact, self.root)


if __name__ == "__main__":
    unittest.main()
