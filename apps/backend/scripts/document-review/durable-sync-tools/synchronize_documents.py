"""Durable local review preparation, with immutable captures and scoped tombstones.

This coordinator has no network, native CMS, approval or customer index client.
An active chunk means prepared for inspection, never approved for retrieval.
"""

import argparse
import importlib.util
import json
from pathlib import Path
import sqlite3
import uuid

SPEC = importlib.util.spec_from_file_location(
    "strapi_preparation",
    Path(__file__).resolve().parents[1] / "prepare_strapi_documents.py",
)
PREPARER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREPARER)
POLICY = "durable-local-document-review-v1"
CAPTURE_KINDS = {
    "original_response",
    "derived_source_text",
    "curated_review_ledger",
    "unclassified_capture",
}
SCHEMA = """
CREATE TABLE captures (sha256 TEXT PRIMARY KEY, data BLOB NOT NULL);
CREATE TABLE sources (source_id TEXT PRIMARY KEY, metadata_json TEXT NOT NULL);
CREATE TABLE documents (
    document_id TEXT PRIMARY KEY, captured_at TEXT NOT NULL,
    fingerprint TEXT NOT NULL, entry_json TEXT NOT NULL
);
CREATE TABLE chunks (
    chunk_id TEXT PRIMARY KEY, document_id TEXT NOT NULL,
    revision TEXT NOT NULL, payload_json TEXT NOT NULL, active INTEGER NOT NULL
);
CREATE INDEX chunks_document ON chunks(document_id, active);
CREATE TABLE runs (
    run_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, summary_json TEXT NOT NULL
);
CREATE INDEX runs_fingerprint ON runs(fingerprint);
CREATE TABLE chunk_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL,
    chunk_id TEXT NOT NULL, operation TEXT NOT NULL,
    FOREIGN KEY(run_id) REFERENCES runs(run_id),
    FOREIGN KEY(chunk_id) REFERENCES chunks(chunk_id)
);
PRAGMA user_version=1;
"""


def digest_json(value):
    return PREPARER.sha(PREPARER.canonical(value).encode())


def digest(value):
    if not isinstance(value, str) or not PREPARER.DIGEST.fullmatch(value):
        raise ValueError("Invalid provenance digest")
    return value


class DocumentStore:
    def __init__(self, database):
        database = Path(database)
        if database.is_symlink() or (database.exists() and not database.is_file()):
            raise ValueError("Invalid local database path")
        self.connection = sqlite3.connect(database, timeout=10, isolation_level=None)
        self.connection.row_factory = sqlite3.Row
        try:
            version = self.connection.execute("PRAGMA user_version").fetchone()[0]
            if version == 0:
                tables = self.connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
                if tables:
                    raise ValueError("Refusing an unrelated database")
                self.connection.executescript("BEGIN IMMEDIATE;" + SCHEMA + "COMMIT;")
            elif version != 1:
                raise ValueError("Unsupported local store schema")
            tables = {
                r[0]
                for r in self.connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                )
            }
            if tables != {
                "captures",
                "sources",
                "documents",
                "chunks",
                "runs",
                "chunk_events",
            }:
                raise ValueError("Unexpected local store tables")
            self.connection.execute("PRAGMA foreign_keys=ON")
            self.connection.execute("PRAGMA journal_mode=WAL")
            self.connection.execute("PRAGMA synchronous=FULL")
        except Exception:
            self.connection.close()
            raise

    def close(self):
        self.connection.close()

    def _archive_bytes(self, data):
        key = PREPARER.sha(data)
        self.connection.execute(
            "INSERT OR IGNORE INTO captures(sha256,data) VALUES(?,?)", (key, data)
        )
        if self.capture_bytes(key) != data:
            raise ValueError("Immutable capture collision")
        return key

    def capture_bytes(self, key):
        digest(key)
        row = self.connection.execute(
            "SELECT data FROM captures WHERE sha256=?", (key,)
        ).fetchone()
        if row is None or PREPARER.sha(row["data"]) != key:
            raise ValueError("Missing or corrupt archived capture")
        return row["data"]

    def _supporting_sources(self, supplied, root):
        items = supplied.get("supporting_sources", [])
        if not isinstance(items, list) or len(items) > 8:
            raise ValueError("Invalid bounded supporting sources")
        result = []
        for item in items:
            if not isinstance(item, dict):
                raise ValueError("Invalid supporting source")
            url = PREPARER.https_url(item.get("url"))
            key = digest(item.get("sha256"))
            role = item.get("role")
            if not isinstance(role, str) or not role or len(role) > 150:
                raise ValueError("Invalid supporting source role")
            archived = item.get("path") is not None
            if archived:
                self._archive_bytes(PREPARER.read_capture(Path(root), item))
            result.append(
                {"url": url, "sha256": key, "role": role, "archived": archived}
            )
        return result

    def _archive_source(self, artifact, root):
        data = PREPARER.read_capture(Path(root), artifact)
        capture_sha = PREPARER.sha(data)
        origin = PREPARER.https_url(artifact.get("origin_url"))
        supplied = artifact.get("source_provenance")
        if supplied is None:
            supplied = {"capture_kind": "unclassified_capture"}
        if not isinstance(supplied, dict):
            raise ValueError("Invalid source provenance")
        kind = supplied.get("capture_kind")
        if kind not in CAPTURE_KINDS:
            raise ValueError("Invalid capture classification")
        if supplied.get("capture_sha256", capture_sha) != capture_sha:
            raise ValueError("Capture provenance does not match bytes")
        response_sha = supplied.get("response_sha256")
        if response_sha is not None:
            digest(response_sha)
        captured_at = supplied.get("captured_at")
        if captured_at is not None:
            PREPARER.timestamp(captured_at)
        final_url = PREPARER.https_url(supplied.get("final_url") or origin)
        derivation = supplied.get("derivation")
        if derivation is not None and (
            not isinstance(derivation, str) or not derivation or len(derivation) > 2000
        ):
            raise ValueError("Invalid derivation description")
        response_data = None
        if supplied.get("response_path") is not None:
            if response_sha is None:
                raise ValueError("Original response requires its digest")
            response_data = PREPARER.read_capture(
                Path(root), {"path": supplied["response_path"], "sha256": response_sha}
            )
        if kind == "original_response":
            if response_sha != capture_sha:
                raise ValueError("Original-response claim does not match capture")
            response_data = data
        self._archive_bytes(data)
        if response_data is not None:
            self._archive_bytes(response_data)
        metadata = {
            "capture_kind": kind,
            "capture_sha256": capture_sha,
            "response_sha256": response_sha,
            "original_response_archived": response_data is not None,
            "origin_url": origin,
            "final_url": final_url,
            "captured_at": captured_at,
            "derivation": derivation,
            "supporting_sources": self._supporting_sources(supplied, root),
            "derivation_verified": False,
            "source_authority_verified": False,
            "retrieval_eligible": False,
            "native_approval_verified": False,
        }
        source_id = digest_json(metadata)
        self.connection.execute(
            "INSERT OR IGNORE INTO sources(source_id,metadata_json) VALUES(?,?)",
            (source_id, PREPARER.canonical(metadata)),
        )
        return {"source_id": source_id, **metadata}

    def archive_source(self, artifact, root):
        """Archive unbound source evidence without inventing CMS identities."""
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            result = self._archive_source(artifact, root)
            self.connection.execute("COMMIT")
            return result
        except Exception:
            self.connection.execute("ROLLBACK")
            raise

    def _previous(self, scope):
        result = {}
        for key in scope:
            row = self.connection.execute(
                "SELECT * FROM documents WHERE document_id=?", (key,)
            ).fetchone()
            if row:
                result[key] = dict(row)
        return result

    def _retry(self, rows, captured_at, fingerprint):
        current_time = PREPARER.timestamp(captured_at)
        for row in rows.values():
            old_time = PREPARER.timestamp(row["captured_at"])
            if current_time < old_time or (
                current_time == old_time and row["fingerprint"] != fingerprint
            ):
                raise ValueError("Stale or conflicting snapshot")
        if rows and all(
            row["fingerprint"] == fingerprint
            and json.loads(row["entry_json"])["status"] != "extraction_failed"
            for row in rows.values()
        ):
            row = self.connection.execute(
                "SELECT summary_json FROM runs WHERE fingerprint=? ORDER BY rowid DESC LIMIT 1",
                (fingerprint,),
            ).fetchone()
            if row:
                return {**json.loads(row["summary_json"]), "already_applied": True}
        return None

    def _enrich(self, result, artifacts, root):
        for entry in result["entries"]:
            entry["native_approval_verified"] = False
            if entry["status"] != "prepared_requires_review":
                continue
            artifact = artifacts[entry["document_id"]]
            source = self._archive_source(artifact, root)
            pages, parser = PREPARER.extract_pages(
                self.capture_bytes(source["capture_sha256"]),
                "application/pdf"
                if entry["parser"].startswith("poppler-")
                else "text/plain",
            )
            if parser != entry["parser"]:
                raise ValueError("Preparation parser mismatch")
            entry["source_provenance"] = source
            entry["normalized_page_sha256"] = [PREPARER.sha(p.encode()) for p in pages]
            entry["preparation_revision_sha256"] = entry["revision_sha256"]
            entry["revision_sha256"] = digest_json(
                {
                    "policy": POLICY,
                    "preparation_revision": entry["preparation_revision_sha256"],
                    "source_id": source["source_id"],
                    "normalized_page_sha256": entry["normalized_page_sha256"],
                }
            )
            for chunk in entry["chunks"]:
                position = chunk["citation"]
                chunk["id"] = "chunk_" + digest_json(
                    {
                        "document_id": entry["document_id"],
                        "revision": entry["revision_sha256"],
                        "page": position["page"],
                        "start": position["start_char"],
                        "end": position["end_char"],
                    }
                )
                chunk.update(retrieval_eligible=False, native_approval_verified=False)
                chunk["citation"].update(
                    **source,
                    parser=parser,
                    normalized_page_sha256=entry["normalized_page_sha256"][
                        chunk["citation"]["page"] - 1
                    ],
                    revision_sha256=entry["revision_sha256"],
                )

    def _persist(self, result, captured_at, fingerprint, run_id):
        removed = result["remove_chunk_ids"]
        added = []
        for key in removed:
            self.connection.execute(
                "UPDATE chunks SET active=0 WHERE chunk_id=?", (key,)
            )
        for entry in result["entries"]:
            for chunk in entry["chunks"]:
                old = self.connection.execute(
                    "SELECT active,payload_json FROM chunks WHERE chunk_id=?",
                    (chunk["id"],),
                ).fetchone()
                payload = PREPARER.canonical(chunk)
                if old and old["payload_json"] != payload:
                    raise ValueError(
                        "Immutable chunk identity has different provenance"
                    )
                if old is None or not old["active"]:
                    added.append(chunk["id"])
                self.connection.execute(
                    "INSERT INTO chunks VALUES(?,?,?,?,1) ON CONFLICT(chunk_id) DO UPDATE SET active=1",
                    (
                        chunk["id"],
                        entry["document_id"],
                        entry["revision_sha256"],
                        payload,
                    ),
                )
            self.connection.execute(
                "INSERT INTO documents VALUES(?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET "
                "captured_at=excluded.captured_at,fingerprint=excluded.fingerprint,entry_json=excluded.entry_json",
                (
                    entry["document_id"],
                    captured_at,
                    fingerprint,
                    PREPARER.canonical(entry),
                ),
            )
        summary = {
            "policy": POLICY,
            "run_id": run_id,
            "already_applied": False,
            "captured_at": captured_at,
            "scope_document_ids": result["scope_document_ids"],
            "prepared_documents": sum(
                e["status"] == "prepared_requires_review" for e in result["entries"]
            ),
            "failed_documents": sum(
                e["status"] == "extraction_failed" for e in result["entries"]
            ),
            "withdrawn_documents": sum(
                e["status"] == "withdrawn" for e in result["entries"]
            ),
            "added_chunks": len(added),
            "withdrawn_chunks": len(removed),
            "review_only": True,
            "locally_applied": True,
            "native_applied": False,
            "retrieval_eligible": False,
            "native_approval_verified": False,
        }
        self.connection.execute(
            "INSERT INTO runs VALUES(?,?,?)",
            (run_id, fingerprint, PREPARER.canonical(summary)),
        )
        for operation, keys in (("withdraw", removed), ("upsert", added)):
            for key in keys:
                self.connection.execute(
                    "INSERT INTO chunk_events(run_id,chunk_id,operation) VALUES(?,?,?)",
                    (run_id, key, operation),
                )
        return summary

    def sync(self, manifest, root):
        """Atomically apply one complete scope; never interpret missing other scopes."""
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            # Validation happens even on replay; at most 100 IDs enter state queries.
            empty = PREPARER.prepare(manifest, root)
            fingerprint = digest_json(manifest)
            rows = self._previous(empty["scope_document_ids"])
            retry = self._retry(rows, empty["captured_at"], fingerprint)
            if retry and len(rows) == len(empty["scope_document_ids"]):
                self.connection.execute("COMMIT")
                return retry
            previous = {key: json.loads(row["entry_json"]) for key, row in rows.items()}
            result = empty
            self._enrich(
                result, {a["document_id"]: a for a in manifest["artifacts"]}, root
            )
            current_chunks = {c["id"] for e in result["entries"] for c in e["chunks"]}
            result["remove_chunk_ids"] = sorted(
                {c["id"] for e in previous.values() for c in e["chunks"]}
                - current_chunks
            )
            for entry in result["entries"]:
                old = previous.get(entry["document_id"])
                if entry["status"] == "prepared_requires_review":
                    entry["change"] = (
                        "new"
                        if old is None
                        else (
                            "unchanged"
                            if old.get("revision_sha256") == entry["revision_sha256"]
                            else "updated"
                        )
                    )
            summary = self._persist(
                result, empty["captured_at"], fingerprint, uuid.uuid4().hex
            )
            self.connection.execute("COMMIT")
            return summary
        except Exception:
            self.connection.execute("ROLLBACK")
            raise

    def review_snapshot(self):
        return {
            "version": 1,
            "policy": POLICY,
            "review_only": True,
            "native_applied": False,
            "retrieval_eligible": False,
            "entries": [
                json.loads(r[0])
                for r in self.connection.execute(
                    "SELECT entry_json FROM documents ORDER BY document_id"
                )
            ],
        }

    def stats(self):
        def count(query):
            return self.connection.execute(query).fetchone()[0]

        return {
            "documents": count("SELECT count(*) FROM documents"),
            "runs": count("SELECT count(*) FROM runs"),
            "archived_captures": count("SELECT count(*) FROM captures"),
            "source_observations": count("SELECT count(*) FROM sources"),
            "historical_chunks": count("SELECT count(*) FROM chunks"),
            "active_review_chunks": count("SELECT count(*) FROM chunks WHERE active=1"),
            "retrieval_eligible_chunks": sum(
                json.loads(row[0]).get("retrieval_eligible") is True
                for row in self.connection.execute(
                    "SELECT payload_json FROM chunks WHERE active=1"
                )
            ),
        }

    def events(self, after=0, limit=1000):
        if (
            not isinstance(after, int)
            or isinstance(after, bool)
            or after < 0
            or not isinstance(limit, int)
            or isinstance(limit, bool)
            or not 1 <= limit <= 1000
        ):
            raise ValueError("Invalid bounded event cursor")
        return [
            dict(row)
            for row in self.connection.execute(
                "SELECT * FROM chunk_events WHERE event_id>? ORDER BY event_id LIMIT ?",
                (after, limit),
            )
        ]

    def quote_citation(self, chunk_id, quote):
        if not isinstance(quote, str) or not quote or len(quote) > 1600:
            raise ValueError("Invalid source quotation")
        row = self.connection.execute(
            "SELECT * FROM chunks WHERE chunk_id=? AND active=1", (chunk_id,)
        ).fetchone()
        if row is None:
            raise ValueError("Withdrawn, revised or unknown chunk")
        document = self.connection.execute(
            "SELECT entry_json FROM documents WHERE document_id=?",
            (row["document_id"],),
        ).fetchone()
        entry = json.loads(document[0])
        chunk = json.loads(row["payload_json"])
        if (
            entry.get("revision_sha256") != row["revision"]
            or chunk not in entry["chunks"]
        ):
            raise ValueError("Chunk is not the current prepared revision")
        citation = chunk["citation"]
        pages, parser = PREPARER.extract_pages(
            self.capture_bytes(citation["source_sha256"]),
            "application/pdf"
            if citation["parser"].startswith("poppler-")
            else "text/plain",
        )
        page = pages[citation["page"] - 1]
        if (
            parser != citation["parser"]
            or PREPARER.sha(page.encode()) != citation["normalized_page_sha256"]
            or page[citation["start_char"] : citation["end_char"]] != chunk["text"]
            or quote not in chunk["text"]
        ):
            raise ValueError("Quotation is not supported by archived source text")
        if citation["original_response_archived"]:
            self.capture_bytes(citation["response_sha256"])
        for source in citation["supporting_sources"]:
            if source["archived"]:
                self.capture_bytes(source["sha256"])
        start = citation["start_char"] + chunk["text"].index(quote)
        return {
            **citation,
            "quote": quote,
            "start_char": start,
            "end_char": start + len(quote),
            "retrieval_eligible": False,
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    store = DocumentStore(args.database)
    try:
        print(
            json.dumps(
                store.sync(PREPARER.read_json(args.manifest), args.manifest.parent)
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    main()
