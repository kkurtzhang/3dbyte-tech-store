"""Finish three preserved customer-coverage gaps with scoped local agent editorial review."""

import argparse
import json
import sqlite3
from pathlib import Path
from local_store import ROOT, SCOPE, Store

ACTOR = "codex_local_customer_coverage_source_review"


def prepare(store):
    capture = json.loads(
        (ROOT / "reports/customer-coverage-primary-captures-v1.json").read_text()
    )
    sources = {}
    for item in capture:
        old = store.db.execute(
            "SELECT id FROM sources WHERE sha256=?", (item["sha256"],)
        ).fetchone()
        if old:
            item = {**item, "id": old[0]}
        store.source({**item, "environment": SCOPE})
        sources["prusa" if "prusa" in item["id"] else "annealing"] = item
    for item in json.loads(
        (ROOT / "reports/supplier-kit-tab-captures-v1.json").read_text()
    )[:2]:
        source = {
            "id": "local_source_coverage_supplier_"
            + item["gid"]
            + "_"
            + item["raw_sha256"][:12],
            "sha256": item["raw_sha256"],
            "text_sha256": item["text_sha256"],
            "source_url": item["source_url"],
            "raw_path": item["raw_path"],
            "text_path": item["text_path"],
            "captured_at": item["checked_at"],
            "raw_capture_available": True,
            "capture_version_immutable": True,
            "environment": SCOPE,
            "scope": "independent supplier hardware table, not 3D Sets manual/FAQ",
        }
        old = store.db.execute(
            "SELECT id FROM sources WHERE sha256=?", (source["sha256"],)
        ).fetchone()
        if old:
            source["id"] = old[0]
        store.source(source)
        sources[item["sheet_title"]] = source
    for key, id in [
        ("tds", "local_source_five_pa-tds"),
        ("shop", "local_source_five_pa-shop"),
    ]:
        sources[key] = json.loads(
            store.db.execute(
                "SELECT payload FROM sources WHERE id=?", (id,)
            ).fetchone()[0]
        )

    def proof(key, quote):
        src = sources[key]
        text = Path(src["text_path"]).read_text()
        start = text.index(quote)
        citation = {
            "local_source_id": src["id"],
            "source_url": src["source_url"],
            "quote": quote,
            "start_char": start,
            "end_char": start + len(quote),
        }
        assert store.cite(citation)
        return citation

    def claim(field, value, citations):
        return {
            "field": field,
            "label": field.replace("_", " "),
            "value": value,
            "text": value or "Unknown for this source scope; retain null.",
            "status": "editorial_inference" if value else "unknown",
            "citations": citations,
        }

    basis = {
        "kind": "agent_source_review_for_authorized_local_development",
        "reviewer_type": "codex_agent",
        "reviewer_actor": ACTOR,
        "user_factual_review_claimed": False,
        "parent_factual_review_pending": True,
        "native_reviewer_event": False,
        "verification": "Immutable source raw/text SHA-256, exact excerpts and scoped original editorial synthesis; no manual/FAQ content.",
    }

    def record(key, title, scope, claims, group=None):
        return {
            "id": "local_dev_guide_" + key,
            "record_key": key,
            "kind": "editorial_guide",
            "title": title,
            "group_key": group,
            "environment": SCOPE,
            "local_record_schema_version": 2,
            "local_product_id": None,
            "local_variant_id": None,
            "staging_native_id": None,
            "staging_export_allowed": False,
            "native_approval": None,
            "source_scope": scope,
            "factual_decision_basis": basis,
            "explicit_unknowns": {
                c["field"]: None for c in claims if c["status"] == "unknown"
            },
            "claims": claims,
        }

    n12 = record(
        "N12",
        "PLA enclosure and heat-creep troubleshooting: check conditions before choosing a cause",
        "Prusa heat-creep article explicitly relevant to MK2.5, MK2.5S, MK3, MK3S and MK3S+. Article-body evidence only; no universal fan RPM or confirmed failure diagnosis.",
        [
            claim(
                "pla_closed_enclosure",
                "For the Prusa MK2.5–MK3S+ article scope, fully closed unventilated PLA printing is a relevant troubleshooting condition. Check enclosure ventilation and heatsink cooling before treating the failure as a filament-drying issue; this is a possible mechanism, not a confirmed diagnosis.",
                [
                    proof("prusa", "Relevant for\nMK2.5\nMK2.5S\nMK3\nMK3S\nMK3S+"),
                    proof(
                        "prusa",
                        "Printing PLA in a fully closed and unventilated enclosure is very likely to cause problems.",
                    ),
                    proof("prusa", "There is not enough airflow cooling the heatsink."),
                ],
            ),
            claim(
                "diagnostic_scope",
                "The scoped Prusa article describes heat creep as only one possible hotend-clog mechanism and says it is often not the most probable explanation. A mid-print extrusion stop does not prove either heat creep or a wet spool; inspect the feed path, clog and cooling conditions separately.",
                [
                    proof(
                        "prusa",
                        "is only one\nof the ways by which your hotend can clog",
                    ),
                    proof("prusa", "not the most probable explanation"),
                ],
            ),
            claim("definitive_failure_cause", None, []),
            claim("wet_spool_diagnosis", None, []),
            claim("cross_printer_variant_applicability", None, []),
        ],
    )
    n13 = record(
        "N13",
        "PA6-CF20 spool drying versus printed-part annealing and minimum nozzle diameter",
        "Fiberon PA6-CF20 TDS V1.1 and captured exact-material manufacturer product page; Polymaker wiki defines annealing of printed parts. Do not transfer the recipe to other grades or certify finished parts.",
        [
            claim(
                "drying_versus_annealing",
                "For Fiberon PA6-CF20 TDS V1.1, the listed drying condition is 100°C / 10 h, while annealing is 100°C / 16 h. Drying filament and annealing a printed part are different operations: a 16-hour spool-dryer run is not the printed-part annealing procedure. Confirm the equipment and spool limits independently.",
                [
                    proof("tds", "100 °C/10H"),
                    proof("tds", "100 °C/16H"),
                    proof(
                        "annealing",
                        "annealing is the process of heating up the printed parts at a certain temperature for a certain period of time.",
                    ),
                ],
            ),
            claim(
                "hardware_minimum",
                "The captured PA6-CF20 manufacturer product page requires a 0.4 mm or larger hardened nozzle. A 0.2 mm hardened nozzle does not meet that stated minimum opening: wear resistance alone does not satisfy the diameter requirement or establish hotend-interface fit.",
                [proof("shop", "0.4mm+ hardened nozzle required")],
            ),
            claim("finished_part_load_rating", None, []),
            claim("other_grade_process_transfer", None, []),
        ],
        group="five_E04",
    )
    n14 = record(
        "N14",
        "Supplier-family RC hardware planning: Landy versus Buggy/Buggster/Sandy",
        "Captured 3DMakerParts published supplier component BOM tabs only. These are independent hardware tables, not 3D Sets build guides/FAQs. Exact DREMC SKU, kit revision and model-release bindings remain unverified.",
        [
            claim(
                "family_belts",
                "The captured Buggy/Buggster/Sandy supplier tab lists two 60XL 30-tooth belts and two 80XL 40-tooth belts, each 6.35 mm wide. The Landy tab lists four HTD 144-3M-06 belts. These are different listed belt families; supplier-family observations do not prove the contents of WES2487/WES2488 or a particular model release.",
                [
                    proof(
                        "BuggyBuggsterSandy",
                        "22 | Timing Belt | 60XL 30 tooth 6.35mm width | 2",
                    ),
                    proof(
                        "BuggyBuggsterSandy",
                        "23 | Timing Belt | 80XL 40 Tooth 6.35mm width | 2",
                    ),
                    proof(
                        "Landy",
                        "25 | Timing Belt | HTD 144-3M-06 Belts (144mm long, 3mm teeth distance, 6mm wide) | 4",
                    ),
                ],
            ),
            claim(
                "family_shocks",
                "The supplier-family tabs list four 55 mm shocks for Buggy/Buggster/Sandy and four 85 mm shocks for Landy. Plan around that table-level difference, then verify the exact selected kit and model revision; this does not establish shock lengths in a received retailer package.",
                [
                    proof(
                        "BuggyBuggsterSandy",
                        "26 | Shock Absorber | 55mm long shock absorber/damper | 4",
                    ),
                    proof(
                        "Landy",
                        "28 | Shock Absorber | 85mm long shock absorber/damper | 4",
                    ),
                ],
            ),
            claim("exact_retailer_sku_bom_binding", None, []),
            claim("model_revision_binding", None, []),
            claim("live_kit_inventory", None, []),
        ],
    )
    return [n12, n13, n14], sources


def activate(name):
    output = ROOT / "reports" / name
    if Path(name).name != name or not name.endswith(".json") or output.exists():
        raise ValueError("New JSON report basename required")
    store = Store()
    try:
        before = store.stats()
        revisions = {
            r["record_key"]: r["revision"]
            for r in store.db.execute(
                "SELECT record_key,revision FROM records WHERE active=1"
            )
        }
        backup = ROOT / "exports" / (Path(name).stem + "-before.sqlite3")
        assert not backup.exists()
        target = sqlite3.connect(backup)
        try:
            store.db.backup(target)
        finally:
            target.close()
        records, sources = prepare(store)
        result = store.ingest(records, actor=ACTOR)
        for key, revision in revisions.items():
            assert (
                store.db.execute(
                    "SELECT revision FROM records WHERE record_key=?", (key,)
                ).fetchone()[0]
                == revision
            )
        report = {
            "before": before,
            "after": store.stats(),
            "result": result,
            "preserved_existing_record_revisions": len(revisions),
            "backup": str(backup),
            "record_keys": [r["record_key"] for r in records],
            "sources": [
                {
                    k: s[k]
                    for k in (
                        "id",
                        "source_url",
                        "sha256",
                        "text_sha256",
                        "captured_at",
                    )
                }
                for s in sources.values()
            ],
            "actor": ACTOR,
            "user_factual_review_claimed": False,
            "native_approvals": 0,
            "staging_writes": 0,
            "paid_calls": 0,
            "listeners_started": False,
        }
        with output.open("x") as f:
            f.write(json.dumps(report, indent=2) + "\n")
        print(
            json.dumps(
                {
                    k: report[k]
                    for k in (
                        "before",
                        "after",
                        "result",
                        "preserved_existing_record_revisions",
                    )
                }
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--report", required=True)
    activate(p.parse_args().report)
