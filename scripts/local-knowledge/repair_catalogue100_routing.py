"""Apply five reviewed routing-only repairs; preserve source facts and history."""

import copy
import json
import re
import sqlite3
from activate_catalogue100 import ACTOR, load_ledger, seed_paths
from local_store import ROOT, Store, clock, digest
from retrieval import Retriever

ALIASES = {"sunlu_s2", "bambu_liquid_glue", "cnc_cleaning_wires"}
PATTERNS = {
    "e3d_revo_six_cold": (
        "exact_revision_fit_and_compatibility",
        r"pin|firmware|guarantee|fit|compatible|revision|package|include|limit|maximum|abrasive|carbon|voltage",
    ),
    "colorfabb_varioshore": (
        "source_conflicts_and_revision",
        r"conflict|revision|current.spool|ams|guarantee|certif|nozzle|recipe|drying|enclos|chamber|safe|(?:apply|same|received).*legacy|legacy.*(?:apply|received|equivalent)",
    ),
}


def main():
    report = ROOT / "reports/routing-repair-v1.json"
    if report.exists():
        raise ValueError(
            "Review report already exists; replay is not authorized by this script"
        )
    store = Store()
    before = store.stats()
    records = []
    updates = []
    try:
        backup = ROOT / "exports/routing-repair-v1-before.sqlite3"
        if backup.exists():
            raise ValueError("Existing snapshot preserved")
        db = sqlite3.connect(backup)
        try:
            store.db.backup(db)
        finally:
            db.close()
        for seed_path in seed_paths():
            seed = json.loads(seed_path.read_text())
            changed = False
            for entry in seed["entries"]:
                key = entry["key"]
                if key not in ALIASES | PATTERNS.keys():
                    continue
                row = store.db.execute(
                    "SELECT * FROM records WHERE group_key=?",
                    ("catalogue_c100_" + key,),
                ).fetchone()
                record = json.loads(row["payload"])
                original = copy.deepcopy(record)
                if key in ALIASES:
                    alias = r"\b" + re.escape(entry["title"]) + r"\b"
                    record["reference_aliases"].append(alias)
                    entry["aliases"].append(alias)
                else:
                    field, pattern = PATTERNS[key]
                    for claim in record["claims"]:
                        if claim["field"] == field:
                            claim["query_pattern"] = pattern
                    for unknown in entry["unknowns"]:
                        if unknown["field"] == field:
                            unknown["query_pattern"] = pattern
                self_facts = lambda r: [
                    c for c in r["claims"] if c["status"] == "supported"
                ]
                if self_facts(original) != self_facts(record):
                    raise ValueError("Routing repair cannot alter supported facts")
                updates.append(
                    {
                        "key": key,
                        "before_revision": row["revision"],
                        "after_revision": digest(record),
                    }
                )
                records.append(record)
                changed = True
            if changed:
                seed_path.write_text(json.dumps(seed, indent=2) + "\n")
        result = store.ingest(records, actor=ACTOR)
        if result["updated"] != 5 or result["created"]:
            raise ValueError("Expected exactly five routing updates")
        ledger = load_ledger()
        for entry in ledger["entries"]:
            change = next((x for x in updates if x["key"] == entry["key"]), None)
            if change:
                entry["record_revision"] = change["after_revision"]
        ledger["last_updated"] = clock()
        (ROOT / "reports/canonical-ledger-routing-v1.json").write_text(
            json.dumps(ledger, indent=2) + "\n"
        )
        (ROOT / "reports/canonical-ledger-current.json").write_text(
            json.dumps(ledger, indent=2) + "\n"
        )
        index = Retriever(store).train()
        result = {
            "before": before,
            "after": store.stats(),
            "updates": updates,
            "import_result": result,
            "source_facts_unchanged": True,
            "native_changes": 0,
            "index": index,
        }
        report.write_text(json.dumps(result, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "routing_records_updated": len(records),
                    "stored_products": store.stats()["products"],
                }
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    main()
