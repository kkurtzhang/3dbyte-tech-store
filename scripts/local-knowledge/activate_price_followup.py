"""Revise dated external price evidence on existing local records only."""

import argparse
import copy
import datetime
import hashlib
import json
import re
import sqlite3
from decimal import Decimal, InvalidOperation
from pathlib import Path

from local_store import ROOT, Store, clock

ACTOR = "codex_local_reference_price_review"
PRICE_FIELDS = {"dated_reference_price", "current_external_reference_price"}


def validate_observation(item):
    try:
        amount = Decimal(item["amount_aud"])
        datetime.date.fromisoformat(item["observed_date"])
    except (KeyError, ValueError, InvalidOperation) as exc:
        raise ValueError("Dated numeric observation required") from exc
    if not amount.is_finite() or amount <= 0 or item.get("currency") != "AUD":
        raise ValueError("Positive AUD observation required")
    kind = item.get("classification")
    if kind not in {
        "dated_current_page",
        "historical_only",
        "retailer_identity_unresolved",
    }:
        raise ValueError("Unsupported price scope")
    if kind == "historical_only" and not item.get("provider_reported_crawl"):
        raise ValueError("Historical evidence requires original reported crawl age")
    if not all(
        item.get("evidence", {}).get(k) for k in ("price", "identity", "currency_tax")
    ):
        raise ValueError(
            "Separate exact price, identity and currency/tax evidence required"
        )


def prepare_record(prior, item, revision):
    validate_observation(item)
    if prior["group_key"] != "catalogue_c100_" + item["key"]:
        raise ValueError("Observation must match the existing identity")
    record = copy.deepcopy(prior)
    if any(
        o.get("observed_date") == item["observed_date"]
        and o.get("classification") == item["classification"]
        for o in record.get("price_observations", [])
    ):
        raise ValueError("Observation already recorded; preserve its history")
    observation = {**copy.deepcopy(item), "prior_record_revision": revision}
    record.setdefault("price_observations", []).append(observation)
    if item["classification"] != "retailer_identity_unresolved":
        citations = [c for proofs in item["evidence"].values() for c in proofs]
        claim = dict(
            field="dated_reference_price",
            label="dated external reference price",
            status="supported",
            value=item["statement"],
            text=item["statement"],
            citations=citations,
            query_pattern=r"(?=.*(?:dated|reference|observed|captured|historical))(?=.*(?:price|\baud\b))",
            source_scope=item["statement"],
            keywords=item.get("identity", item["key"]),
        )
        record["claims"] = [
            c for c in record["claims"] if c["field"] not in PRICE_FIELDS
        ] + [claim]
        record["explicit_unknowns"].pop("dated_reference_price", None)
        if item["classification"] == "historical_only":
            record["claims"].append(
                dict(
                    field="current_external_reference_price",
                    label="current external reference price",
                    status="unknown",
                    value=None,
                    citations=[],
                    text="Only a historical cached price is verified; current external price is unknown.",
                    query_pattern=r"(?=.*(?:current|live|today))(?=.*(?:price|\baud\b))",
                    keywords="current external price",
                )
            )
            record["explicit_unknowns"]["current_external_reference_price"] = None
    record["factual_decision_basis"] = dict(
        kind="agent_source_review_for_authorized_local_development",
        reviewer_actor=ACTOR,
        reviewer_type="codex_agent",
        user_factual_review_claimed=False,
        native_reviewer_event=False,
        prior_factual_basis=copy.deepcopy(prior["factual_decision_basis"]),
        verification="Dated external price-only follow-up; exact archived citations checked. Existing non-price claims and product identities preserved.",
    )
    if [c for c in record["claims"] if c["field"] not in PRICE_FIELDS] != [
        c for c in prior["claims"] if c["field"] not in PRICE_FIELDS
    ]:
        raise ValueError("Non-price facts changed")
    return record


def table_rows(db, table):
    return sorted(tuple(r) for r in db.execute("SELECT * FROM " + table))


def backup(db, path):
    if path.exists():
        raise ValueError("Preserve existing snapshot")
    target = sqlite3.connect(path)
    try:
        db.backup(target)
    finally:
        target.close()


def activate(packet_path, report_name):
    if not re.fullmatch(r"[a-z0-9-]+\.json", report_name):
        raise ValueError("New report basename required")
    target = ROOT / "reports" / report_name
    if target.exists():
        raise ValueError("Preserve existing receipt")
    packet = json.loads(packet_path.read_text())
    observations = packet["observations"]
    keys = [o["key"] for o in observations]
    if len(keys) != len(set(keys)):
        raise ValueError("Duplicate canonical identity")
    store = Store()
    try:
        prior = {
            r["group_key"]: dict(r)
            for r in store.db.execute(
                "SELECT * FROM records WHERE kind='source_document' AND active=1"
            )
        }
        if any("catalogue_c100_" + key not in prior for key in keys):
            raise ValueError("Cannot create a new product")
        immutable_tables = [
            "products",
            "local_reference_variants",
            "local_record_bindings",
        ]
        tables = {
            r[0]
            for r in store.db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        immutable_tables = [t for t in immutable_tables if t in tables]
        preserved = {t: table_rows(store.db, t) for t in immutable_tables + ["sources"]}
        all_records = {
            r["id"]: dict(r) for r in store.db.execute("SELECT * FROM records")
        }
        before = store.stats()
        ledger_path = ROOT / "reports/canonical-ledger-current.json"
        ledger = json.loads(ledger_path.read_text())
        assert sum(bool(e.get("counted")) for e in ledger["entries"]) == 100
        stem = Path(report_name).stem
        before_path = ROOT / "exports" / (stem + "-before.sqlite3")
        backup(store.db, before_path)
        sources = {
            s["id"]: s
            for name in packet["source_manifests"]
            for s in json.loads((ROOT / "reports" / name).read_text())
            if s.get("id")
        }
        used = {
            c["local_source_id"]
            for o in observations
            for proofs in o["evidence"].values()
            for c in proofs
        }
        for source_id in sorted(used):
            store.source(sources[source_id])
        records = []
        for item in observations:
            row = prior["catalogue_c100_" + item["key"]]
            if item.get("expected_prior_revision") != row["revision"]:
                raise ValueError("Reviewed prior revision changed")
            for proofs in item["evidence"].values():
                if not all(store.cite(c) for c in proofs):
                    raise ValueError("Exact archived citation failed")
            records.append(
                prepare_record(json.loads(row["payload"]), item, row["revision"])
            )
        result = store.ingest(records, actor=ACTOR)
        changed = {r["id"] for r in records}
        for row in store.db.execute("SELECT * FROM records"):
            if row["id"] not in changed:
                assert dict(row) == all_records[row["id"]]
        for record in records:
            old = prior[record["group_key"]]
            history = store.db.execute(
                "SELECT payload FROM revisions WHERE record_id=? AND revision=?",
                (record["id"], old["revision"]),
            ).fetchone()
            assert history and history[0] == old["payload"]
        for table in immutable_tables:
            assert table_rows(store.db, table) == preserved[table]
        assert set(preserved["sources"]).issubset(set(table_rows(store.db, "sources")))
        after = store.stats()
        assert before["products"] == after["products"] == 103
        assert before["records"] == after["records"]
        for entry in ledger["entries"]:
            key = entry.get("key")
            if key in keys:
                group = "catalogue_c100_" + key
                entry["record_revision"] = store.db.execute(
                    "SELECT revision FROM records WHERE group_key=? AND kind=?",
                    (group, "source_document"),
                ).fetchone()[0]
        ledger_export = ROOT / "exports" / (stem + "-ledger.json")
        ledger_export.write_text(json.dumps(ledger, indent=2) + "\n")
        ledger_path.write_text(json.dumps(ledger, indent=2) + "\n")
        after_path = ROOT / "exports" / (stem + "-after.sqlite3")
        backup(store.db, after_path)
        artifacts = {
            str(p): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in [packet_path, before_path, after_path, ledger_export]
        }
        receipt = dict(
            timestamp=clock(),
            before=before,
            after=after,
            ingest=result,
            artifacts=artifacts,
            source_count=len(used),
            source_hashes={k: sources[k]["sha256"] for k in sorted(used)},
            observations=[
                {k: o[k] for k in ["key", "amount_aud", "classification", "statement"]}
                for o in observations
            ],
            holds=packet["holds"],
            invariants=dict(
                counted_products=100,
                held_references=3,
                product_rows_unchanged=True,
                non_price_claims_unchanged=True,
                prior_source_rows_unchanged=True,
                prior_revisions_preserved=True,
                native_changes=0,
            ),
        )
        with target.open("x") as output:
            json.dump(receipt, output, indent=2)
        print(
            json.dumps(
                {
                    "receipt": str(target),
                    "ingest": result,
                    "invariants": receipt["invariants"],
                }
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--packet", required=True, type=Path)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    activate(args.packet, args.report)
