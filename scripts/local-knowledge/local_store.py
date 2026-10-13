"""Dedicated local-development knowledge store. No remote DB or native CMS/commerce client."""

import datetime, hashlib, json, os, sqlite3
from pathlib import Path

ROOT = Path(
    os.environ.get("LOCAL_KNOWLEDGE_WORKSPACE", Path(__file__).resolve().parent)
).resolve()
SCOPE = "local_development"


def canonical(v):
    return json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(v):
    return hashlib.sha256(canonical(v).encode()).hexdigest()


def clock():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def verify_boundary():
    b = json.loads((ROOT / "environment-boundary.json").read_text())
    if (
        b["environment"] != SCOPE
        or b["database_connection_uri"] is not None
        or b["allowed_http_bind_host"] != "127.0.0.1"
    ):
        raise ValueError("Wrong local environment boundary")
    p = Path(b["database_path"])
    if (
        p.is_symlink()
        or not p.resolve().is_relative_to(ROOT / "data")
        or not ROOT.resolve().is_relative_to(Path("/Volumes/MINI-M1"))
    ):
        raise ValueError("Database/storage boundary violation")
    if os.stat(ROOT).st_dev != os.stat("/Volumes/MINI-M1").st_dev:
        raise ValueError("External volume boundary violation")
    if (
        sum(x.stat().st_size for x in ROOT.rglob("*") if x.is_file())
        > b["limits"]["workspace_bytes"]
    ):
        raise ValueError("Workspace storage cap reached")
    return b


SCHEMA = """
CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE products(id TEXT PRIMARY KEY,group_key TEXT UNIQUE NOT NULL,payload TEXT NOT NULL);
CREATE TABLE sources(id TEXT PRIMARY KEY,source_url TEXT NOT NULL,sha256 TEXT NOT NULL,text_sha256 TEXT,payload TEXT NOT NULL);
CREATE TABLE records(id TEXT PRIMARY KEY,record_key TEXT UNIQUE NOT NULL,kind TEXT NOT NULL,group_key TEXT,title TEXT NOT NULL,revision TEXT NOT NULL,payload TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE editorial_decisions(id INTEGER PRIMARY KEY,record_id TEXT NOT NULL,revision TEXT NOT NULL,actor TEXT NOT NULL,scope TEXT NOT NULL,decision TEXT NOT NULL,decided_at TEXT NOT NULL,evidence TEXT NOT NULL);
CREATE TABLE claims(id TEXT PRIMARY KEY,record_id TEXT NOT NULL,field TEXT NOT NULL,status TEXT NOT NULL,text TEXT NOT NULL,payload TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE VIRTUAL TABLE claim_fts USING fts5(claim_id UNINDEXED,record_id UNINDEXED,text,tokenize='porter unicode61');
CREATE TABLE revisions(id INTEGER PRIMARY KEY,record_id TEXT NOT NULL,revision TEXT NOT NULL,payload TEXT NOT NULL,changed_at TEXT NOT NULL);
PRAGMA user_version=1;
"""


class Store:
    def __init__(self):
        b = verify_boundary()
        path = Path(b["database_path"])
        self.db = sqlite3.connect(path, timeout=10, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        if self.db.execute("PRAGMA user_version").fetchone()[0] == 0:
            if self.db.execute(
                "SELECT count(*) FROM sqlite_master WHERE type='table'"
            ).fetchone()[0]:
                raise ValueError("Unrelated database")
            self.db.executescript("BEGIN IMMEDIATE;" + SCHEMA + "COMMIT;")
            self.db.execute("INSERT INTO metadata VALUES(?,?)", ("environment", SCOPE))
        if (
            self.db.execute(
                "SELECT value FROM metadata WHERE key='environment'"
            ).fetchone()[0]
            != SCOPE
        ):
            raise ValueError("Wrong existing database scope")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.execute("PRAGMA max_page_count=65536")
        self.db.execute("PRAGMA temp_store=MEMORY")

    def close(self):
        self.db.close()

    def source(self, item):
        path = Path(item["raw_path"])
        assert path.resolve().is_relative_to(ROOT / "sources")
        assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"]
        if item.get("text_path"):
            assert (
                hashlib.sha256(Path(item["text_path"]).read_bytes()).hexdigest()
                == item["text_sha256"]
            )
        self.db.execute(
            "INSERT OR IGNORE INTO sources VALUES(?,?,?,?,?)",
            (
                item["id"],
                item["source_url"],
                item["sha256"],
                item.get("text_sha256"),
                canonical(item),
            ),
        )

    def cite(self, evidence):
        row = self.db.execute(
            "SELECT payload FROM sources WHERE id=?", (evidence["local_source_id"],)
        ).fetchone()
        if not row:
            return None
        src = json.loads(row[0])
        if (
            src.get("raw_capture_available") is False
            or not Path(src["raw_path"]).is_file()
        ):
            return None
        if (
            hashlib.sha256(Path(src["raw_path"]).read_bytes()).hexdigest()
            != src["sha256"]
        ):
            return None
        checked = datetime.datetime.fromisoformat(
            src["captured_at"].replace("Z", "+00:00")
        )
        now = datetime.datetime.now(datetime.timezone.utc)
        if checked > now or now - checked > datetime.timedelta(days=90):
            return None
        quote = evidence.get("quote") or evidence.get("evidence_excerpt")
        if not quote:
            return None
        if evidence.get("json_pointer"):
            obj = json.loads(Path(src["raw_path"]).read_text())
            try:
                for key in evidence["json_pointer"].strip("/").split("/"):
                    obj = obj[int(key)] if isinstance(obj, list) else obj[key]
            except (ValueError, IndexError, KeyError, TypeError):
                return None
            if str(obj) != quote:
                return None
        else:
            text = Path(src["text_path"]).read_text()
            if hashlib.sha256(text.encode()).hexdigest() != src["text_sha256"]:
                return None
            if text[evidence["start_char"] : evidence["end_char"]] != quote:
                return None
        return {
            **evidence,
            "source_url": src["source_url"],
            "source_sha256": src["sha256"],
            "environment": SCOPE,
        }

    def ingest(self, records, actor="codex_local_development"):
        verify_boundary()
        created = updated = skipped = 0
        self.db.execute("BEGIN IMMEDIATE")
        try:
            for r in records:
                assert (
                    r["environment"] == SCOPE
                    and r["id"].startswith("local_dev_")
                    and r["staging_native_id"] is None
                )
                assert not r["staging_export_allowed"] and r["native_approval"] is None
                revision = digest({k: v for k, v in r.items() if k != "revision"})
                old = self.db.execute(
                    "SELECT revision,payload FROM records WHERE id=?", (r["id"],)
                ).fetchone()
                if old and old["revision"] == revision:
                    skipped += 1
                    continue
                for claim in r["claims"]:
                    if claim["status"] == "supported":
                        assert claim["citations"] and all(
                            self.cite(c) for c in claim["citations"]
                        ), claim
                    elif claim["status"] == "unknown":
                        assert (
                            claim["value"] is None and claim["citations"] == []
                        ), claim
                    else:
                        assert (
                            claim["status"] == "editorial_inference"
                            and claim["citations"]
                            and all(self.cite(c) for c in claim["citations"])
                        )
                if old:
                    self.db.execute(
                        "INSERT INTO revisions(record_id,revision,payload,changed_at) VALUES(?,?,?,?)",
                        (r["id"], old["revision"], old["payload"], clock()),
                    )
                    updated += 1
                else:
                    created += 1
                self.db.execute(
                    "INSERT OR REPLACE INTO records VALUES(?,?,?,?,?,?,?,1)",
                    (
                        r["id"],
                        r["record_key"],
                        r["kind"],
                        r.get("group_key"),
                        r["title"],
                        revision,
                        canonical(r),
                    ),
                )
                self.db.execute(
                    "UPDATE claims SET active=0 WHERE record_id=?", (r["id"],)
                )
                self.db.execute("DELETE FROM claim_fts WHERE record_id=?", (r["id"],))
                for claim in r["claims"]:
                    key = (
                        "local_claim_"
                        + hashlib.sha256(
                            (r["id"] + "|" + claim["field"] + "|" + revision).encode()
                        ).hexdigest()[:32]
                    )
                    text = " ".join(
                        [
                            r["title"],
                            claim["label"],
                            claim["field"].replace("_", " "),
                            claim["text"],
                            claim.get("keywords", ""),
                        ]
                    )
                    payload = {
                        **claim,
                        "record_id": r["id"],
                        "record_key": r["record_key"],
                        "group_key": r.get("group_key"),
                        "record_revision": revision,
                        "environment": SCOPE,
                        "local_product_id": r.get("local_product_id"),
                        "local_variant_id": r.get("local_variant_id"),
                        "source_scope": claim.get("source_scope")
                        or r.get("source_scope"),
                        "explicit_unknowns": r.get("explicit_unknowns", {}),
                        "editorial_basis": r["factual_decision_basis"],
                    }
                    self.db.execute(
                        "INSERT OR REPLACE INTO claims VALUES(?,?,?,?,?,?,1)",
                        (
                            key,
                            r["id"],
                            claim["field"],
                            claim["status"],
                            text,
                            canonical(payload),
                        ),
                    )
                    self.db.execute(
                        "INSERT INTO claim_fts VALUES(?,?,?)", (key, r["id"], text)
                    )
                evidence = {
                    "factual_source": r["factual_decision_basis"],
                    "decision_is_local": True,
                    "native_reviewer_event": False,
                }
                self.db.execute(
                    "INSERT INTO editorial_decisions(record_id,revision,actor,scope,decision,decided_at,evidence) VALUES(?,?,?,?,?,?,?)",
                    (
                        r["id"],
                        revision,
                        actor,
                        SCOPE,
                        "accepted_for_local_development",
                        clock(),
                        canonical(evidence),
                    ),
                )
            self.db.execute("COMMIT")
        except Exception:
            self.db.execute("ROLLBACK")
            raise
        return {
            "created": created,
            "updated": updated,
            "skipped": skipped,
            "environment": SCOPE,
            "native_changes": 0,
        }

    def stats(self):
        count = lambda q: self.db.execute(q).fetchone()[0]
        return {
            "products": count("SELECT count(*) FROM products"),
            "records": count("SELECT count(*) FROM records WHERE active=1"),
            "documents": count(
                "SELECT count(*) FROM records WHERE active=1 AND kind='source_document'"
            ),
            "guides": count(
                "SELECT count(*) FROM records WHERE active=1 AND kind='editorial_guide'"
            ),
            "variants": count("SELECT count(*) FROM local_reference_variants")
            if count(
                "SELECT count(*) FROM sqlite_master WHERE name='local_reference_variants'"
            )
            else 0,
            "sources": count("SELECT count(*) FROM sources"),
            "claims": count("SELECT count(*) FROM claims WHERE active=1"),
            "supported_claims": count(
                "SELECT count(*) FROM claims WHERE active=1 AND status='supported'"
            ),
            "unknown_claims": count(
                "SELECT count(*) FROM claims WHERE active=1 AND status='unknown'"
            ),
            "local_editorial_decisions": count(
                "SELECT count(*) FROM editorial_decisions"
            ),
            "environment": SCOPE,
            "native_approvals": 0,
        }

    def rows(self):
        return [
            dict(r)
            for r in self.db.execute(
                "SELECT c.id,c.text,c.payload,r.revision FROM claims c JOIN records r ON r.id=c.record_id WHERE c.active=1 AND r.active=1 ORDER BY c.id"
            )
        ]
