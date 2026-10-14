import hashlib
import copy
import importlib.util
import io
import json
import os
import stat
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

MODULE_PATH = Path(__file__).resolve().parents[1] / "prepare_strapi_documents.py"
spec = importlib.util.spec_from_file_location("prepare_strapi_documents", MODULE_PATH)
preparation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preparation)


class PreparationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.file = self.root / "manual.txt"
        self.file.write_text(
            "Printer setup\nNozzle size: 0.4 mm\fMaintenance\nVoltage is unspecified."
        )
        self.document = {
            "documentId": "doc_fixture",
            "is_public": True,
            "publishedAt": "2026-10-08T00:00:00Z",
            "updatedAt": "2026-10-08T00:00:00Z",
            "title": "Manufacturer manual",
            "medusa_product_id": "prod_fixture",
            "product_handle": "fixture",
            "product_title": "Fixture printer",
            "version": "v1",
            "language": "en",
            "source_kind": "official_manual",
            "source_url": "https://manufacturer.example/manual.txt",
            "source_checked_at": "2026-10-08T00:00:00Z",
            "file": {"url": "https://cdn.example/manual.txt", "mime": "text/plain"},
        }
        self.manifest = {
            "version": 1,
            "snapshot_complete": True,
            "captured_at": "2026-10-08T01:00:00Z",
            "scope_document_ids": ["doc_fixture"],
            "documents": [self.document],
            "artifacts": [
                {
                    "document_id": "doc_fixture",
                    "path": "manual.txt",
                    "sha256": hashlib.sha256(self.file.read_bytes()).hexdigest(),
                    "origin_url": "https://cdn.example/manual.txt",
                }
            ],
        }

    def tearDown(self):
        self.temp.cleanup()

    def test_hundred_document_batch_and_scoped_removal_preserve_other_products(self):
        documents, artifacts = [], []
        for index in range(100):
            document = copy.deepcopy(self.document)
            document.update(
                documentId=f"doc_{index:03}", medusa_product_id=f"prod_{index:03}"
            )
            documents.append(document)
            artifacts.append(
                {**self.manifest["artifacts"][0], "document_id": document["documentId"]}
            )
        manifest = {
            **self.manifest,
            "scope_document_ids": [d["documentId"] for d in documents],
            "documents": documents,
            "artifacts": artifacts,
        }
        first = preparation.prepare(manifest, self.root)
        self.assertEqual(len(first["entries"]), 100)
        self.assertEqual(
            len(
                {chunk["id"] for entry in first["entries"] for chunk in entry["chunks"]}
            ),
            200,
        )
        smaller = {
            **manifest,
            "scope_document_ids": manifest["scope_document_ids"][:50],
            "documents": copy.deepcopy(documents[:50]),
            "artifacts": artifacts[:50],
        }
        smaller["documents"][0]["publishedAt"] = None
        second = preparation.prepare(smaller, self.root, first)
        removed = {chunk["id"] for chunk in first["entries"][0]["chunks"]}
        self.assertEqual(set(second["remove_chunk_ids"]), removed)
        unaffected = {
            chunk["id"] for entry in first["entries"][50:] for chunk in entry["chunks"]
        }
        self.assertFalse(unaffected.intersection(second["remove_chunk_ids"]))
        with self.assertRaisesRegex(ValueError, "bounded snapshot"):
            preparation.prepare(
                {
                    **manifest,
                    "scope_document_ids": manifest["scope_document_ids"] + ["doc_101"],
                },
                self.root,
            )

    def prepare(self, previous=None):
        return preparation.prepare(self.manifest, self.root, previous=previous)

    def test_preserves_document_product_version_page_hash_and_citation(self):
        result = self.prepare()
        entry = result["entries"][0]
        self.assertEqual(entry["status"], "prepared_requires_review")
        self.assertFalse(entry["retrieval_eligible"])
        self.assertEqual(len(entry["chunks"]), 2)
        citation = entry["chunks"][1]["citation"]
        self.assertEqual(citation["page"], 2)
        self.assertEqual(citation["document_id"], "doc_fixture")
        self.assertEqual(citation["version"], "v1")
        self.assertEqual(citation["medusa_product_id"], "prod_fixture")
        self.assertEqual(citation["source_url"], self.document["source_url"])
        self.assertEqual(citation["asset_url"], self.document["file"]["url"])
        self.assertEqual(
            citation["source_sha256"], self.manifest["artifacts"][0]["sha256"]
        )
        self.assertIn("unspecified", entry["chunks"][1]["text"])

    def test_repeated_preparation_is_deterministic_and_unchanged_revisions_keep_ids(
        self,
    ):
        first = self.prepare()
        self.assertEqual(first, self.prepare())
        second = self.prepare(previous=first)
        self.assertEqual(second["entries"][0]["change"], "unchanged")
        self.assertEqual(second["remove_chunk_ids"], [])
        self.assertEqual(first["entries"][0]["chunks"], second["entries"][0]["chunks"])

    def test_updates_replace_old_chunks_and_versions_are_bound_to_revision(self):
        first = self.prepare()
        self.document["version"] = "v2"
        second = self.prepare(previous=first)
        old_ids = [chunk["id"] for chunk in first["entries"][0]["chunks"]]
        self.assertEqual(second["entries"][0]["change"], "updated")
        self.assertEqual(second["remove_chunk_ids"], sorted(old_ids))
        self.assertNotEqual(
            first["entries"][0]["revision_sha256"],
            second["entries"][0]["revision_sha256"],
        )

    def test_deleted_unpublished_and_private_documents_have_no_text_and_remove_prior_chunks(
        self,
    ):
        for change in ["deleted", "unpublished", "private"]:
            with self.subTest(change=change):
                first = self.prepare()
                current = json.loads(json.dumps(self.manifest))
                if change == "deleted":
                    current["documents"] = []
                    current["artifacts"] = []
                elif change == "unpublished":
                    current["documents"][0]["publishedAt"] = None
                else:
                    current["documents"][0]["is_public"] = False
                result = preparation.prepare(current, self.root, previous=first)
                self.assertEqual(len(result["remove_chunk_ids"]), 2)
                self.assertFalse(any(entry["chunks"] for entry in result["entries"]))
                self.assertNotIn("Nozzle size", json.dumps(result))

    def test_extraction_failure_never_leaves_old_chunks_retrievable(self):
        first = self.prepare()
        self.file.write_text("\0\0\0")
        self.manifest["artifacts"][0]["sha256"] = hashlib.sha256(
            self.file.read_bytes()
        ).hexdigest()
        result = self.prepare(previous=first)
        self.assertEqual(result["entries"][0]["status"], "extraction_failed")
        self.assertEqual(result["entries"][0]["chunks"], [])
        self.assertEqual(len(result["remove_chunk_ids"]), 2)

    def test_tampered_capture_wrong_origin_symlink_and_traversal_are_rejected(self):
        for field, value in [
            ("sha256", "0" * 64),
            ("origin_url", "https://other.example/manual.txt"),
            ("path", "../manual.txt"),
        ]:
            with self.subTest(field=field):
                changed = json.loads(json.dumps(self.manifest))
                changed["artifacts"][0][field] = value
                result = preparation.prepare(changed, self.root)
                self.assertEqual(result["entries"][0]["status"], "extraction_failed")
                self.assertEqual(result["entries"][0]["chunks"], [])
        self.file.unlink()
        self.file.symlink_to(self.root / "missing.txt")
        self.assertEqual(self.prepare()["entries"][0]["status"], "extraction_failed")

    def test_partial_cross_scope_or_duplicate_snapshot_cannot_plan_deletion(self):
        for change in ["partial", "scope", "duplicate"]:
            changed = json.loads(json.dumps(self.manifest))
            if change == "partial":
                changed["snapshot_complete"] = False
            elif change == "scope":
                changed["scope_document_ids"] = ["different_doc"]
            else:
                changed["documents"].append(changed["documents"][0])
            with self.assertRaises(ValueError):
                preparation.prepare(changed, self.root)

    def test_oversized_input_and_unsafe_source_do_not_create_chunks(self):
        self.file.write_bytes(b"a" * (10 * 1024 * 1024 + 1))
        self.manifest["artifacts"][0]["sha256"] = hashlib.sha256(
            self.file.read_bytes()
        ).hexdigest()
        self.assertEqual(self.prepare()["entries"][0]["status"], "extraction_failed")
        self.document["source_url"] = (
            "https://user:password@manufacturer.example/manual.txt"
        )
        with self.assertRaises(ValueError):
            self.prepare()

    def test_page_chunks_keep_bounded_offsets_and_reconstruct_all_text(self):
        text = "Technical fact. " * 400
        self.file.write_text(text)
        self.manifest["artifacts"][0]["sha256"] = hashlib.sha256(
            self.file.read_bytes()
        ).hexdigest()
        chunks = self.prepare()["entries"][0]["chunks"]
        self.assertTrue(all(len(chunk["text"]) <= 1600 for chunk in chunks))
        self.assertEqual("".join(chunk["text"] for chunk in chunks), text.strip())
        self.assertEqual(chunks[0]["citation"]["start_char"], 0)
        self.assertEqual(chunks[-1]["citation"]["end_char"], len(text.strip()))

    def test_real_local_pdf_parser_preserves_page_and_capture_hash(self):
        objects = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        ]
        content = (
            b"BT /F1 12 Tf 20 200 Td (Synthetic test manual: voltage unknown.) Tj ET"
        )
        objects.append(
            b"<< /Length "
            + str(len(content)).encode()
            + b" >>\nstream\n"
            + content
            + b"\nendstream"
        )
        pdf = b"%PDF-1.4\n"
        offsets = [0]
        for index, obj in enumerate(objects, 1):
            offsets.append(len(pdf))
            pdf += f"{index} 0 obj\n".encode() + obj + b"\nendobj\n"
        start = len(pdf)
        pdf += f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode()
        pdf += b"".join(f"{offset:010} 00000 n \n".encode() for offset in offsets[1:])
        pdf += f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n".encode()
        (self.root / "manual.pdf").write_bytes(pdf)
        self.document["file"]["mime"] = "application/pdf"
        self.manifest["artifacts"][0].update(
            path="manual.pdf", sha256=hashlib.sha256(pdf).hexdigest()
        )
        entry = self.prepare()["entries"][0]
        self.assertEqual(entry["status"], "prepared_requires_review")
        self.assertEqual(entry["page_count"], 1)
        self.assertIn("voltage unknown", entry["chunks"][0]["text"])
        with patch.object(preparation.shutil, "which", return_value=None):
            failed = self.prepare(
                previous={
                    "version": 1,
                    "policy": preparation.POLICY,
                    "entries": [entry],
                }
            )
        self.assertEqual(failed["entries"][0]["status"], "extraction_failed")
        self.assertEqual(len(failed["remove_chunk_ids"]), 1)

    def test_invalid_json_duplicate_keys_and_non_artifact_paths_fail_closed(self):
        path = self.root / "duplicate.json"
        path.write_text('{"snapshot_complete":false,"snapshot_complete":true}')
        with self.assertRaises(ValueError):
            preparation.read_json(path)
        self.manifest["artifacts"][0]["path"] = ".env"
        self.assertEqual(self.prepare()["entries"][0]["status"], "extraction_failed")

    def test_non_regular_capture_and_snapshot_fail_without_waiting_for_a_writer(self):
        self.file.unlink()
        os.mkfifo(self.file)
        self.assertEqual(self.prepare()["entries"][0]["status"], "extraction_failed")
        with self.assertRaises(ValueError):
            preparation.read_json(self.file)

    def test_malformed_previous_preparation_cannot_plan_removals(self):
        with self.assertRaises(ValueError):
            self.prepare(
                previous={"version": 1, "policy": preparation.POLICY, "entries": [None]}
            )

    def test_cli_creates_private_review_output_and_refuses_to_overwrite_it(self):
        manifest = self.root / "snapshot.json"
        manifest.write_text(json.dumps(self.manifest))
        output = self.root / "prepared.json"
        args = ["prepare", str(manifest), str(output)]
        with patch("sys.argv", args), redirect_stdout(io.StringIO()):
            preparation.main()
        first = output.read_bytes()
        result = json.loads(first)
        self.assertTrue(result["review_only"])
        self.assertFalse(result["applied"])
        self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o600)
        with patch("sys.argv", args), redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as failed:
                preparation.main()
        self.assertEqual(failed.exception.code, 1)
        self.assertEqual(output.read_bytes(), first)

    def test_unknown_mime_and_naive_timestamps_do_not_prepare_content(self):
        self.document["file"]["mime"] = "application/octet-stream"
        self.assertEqual(self.prepare()["entries"][0]["status"], "extraction_failed")
        self.manifest["captured_at"] = "2026-10-08T00:00:00"
        with self.assertRaises(ValueError):
            self.prepare()


if __name__ == "__main__":
    unittest.main()
