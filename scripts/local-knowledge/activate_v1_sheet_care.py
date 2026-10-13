"""Accept a bounded original sheet-care guide; no complete source guide/FAQ is indexed."""

import argparse
import json
import sqlite3
from pathlib import Path
from local_store import ROOT, SCOPE, Store

ACTOR = "codex_local_v1_sheet_source_review"


def prepare(store):
    sources = {
        s["key"]: s
        for s in json.loads(
            (ROOT / "reports/v1-gap-review-captures-v1.json").read_text()
        )
        if s.get("id")
    }

    def cite(key, quote):
        source = sources[key]
        text = Path(source["text_path"]).read_text()
        start = text.index(quote)
        proof = {
            "local_source_id": source["id"],
            "source_url": source["source_url"],
            "quote": quote,
            "start_char": start,
            "end_char": start + len(quote),
        }
        assert store.cite(proof)
        return proof

    def claim(field, value, citations):
        return {
            "field": field,
            "label": field.replace("_", " "),
            "value": value,
            "text": value
            or "Unknown outside the named Prusa sheet scope; retain null.",
            "status": "editorial_inference" if value else "unknown",
            "citations": citations,
        }

    claims = [
        claim(
            "sheet_acetone_limit",
            "Prusa prohibits acetone on its satin and textured sheets because it deteriorates their surfaces. Its smooth-sheet page allows occasional acetone only when IPA is insufficient. The smooth-sheet exception does not transfer to another coating or brand.",
            [
                cite(
                    "prusa_satin",
                    "Never clean the sheet with acetone! It will deteriorate the surface.",
                ),
                cite(
                    "prusa_textured",
                    "Never clean the sheet with acetone! It will deteriorate the surface!",
                ),
                cite(
                    "prusa_smooth",
                    "1-2 times a month, it can be cleaned the same way with acetone if IPA cleaning is not sufficient.",
                ),
            ],
        ),
        claim(
            "sheet_cold_ipa",
            "The named Prusa sheet pages specify roughly90% IPA or the stated alcohol cleaner while the sheet is cold. Identify the sheet before choosing its maintenance method; this is not a procedure for every coated plate.",
            [
                cite("prusa_satin", "~90% IPA\nwhen the sheet is cold."),
                cite("prusa_textured", "~90% IPA\nor denatured alcohol when cold."),
                cite(
                    "prusa_smooth",
                    "Clean with ~90% IPA (isopropyl alcohol) or denatured alcohol when cold.",
                ),
            ],
        ),
        claim(
            "sheet_scraper_scope",
            "Prusa’s satin/textured pages say they are not scratch-resistant and prohibit metal spatulas for print removal. A manufacturer-described stainless tool does not establish scratch-free use on those sheets; confirm the surface/tool pairing separately.",
            [
                cite(
                    "prusa_satin",
                    "Do not use metal spatulas, etc., to remove the prints.",
                ),
                cite(
                    "prusa_textured",
                    "Do not use metal spatulas, etc., to remove the prints.",
                ),
            ],
        ),
        claim("cross_brand_cleaner_compatibility", None, []),
        claim("unidentified_sheet_chemistry", None, []),
        claim("scratch_free_removal_guarantee", None, []),
    ]
    return {
        "id": "local_dev_guide_N15",
        "record_key": "N15",
        "kind": "editorial_guide",
        "title": "Identify the Prusa sheet before choosing a cleaner or removal tool",
        "group_key": None,
        "environment": SCOPE,
        "local_record_schema_version": 2,
        "local_product_id": None,
        "local_variant_id": None,
        "staging_native_id": None,
        "staging_export_allowed": False,
        "native_approval": None,
        "source_scope": "Prusa satin, textured and smooth sheet manufacturer-support facts only. Original bounded synthesis; no full guide, FAQ, instructions, images or diagrams are indexed. Other brands/coatings remain unverified.",
        "factual_decision_basis": {
            "kind": "agent_source_review_for_authorized_local_development",
            "reviewer_type": "codex_agent",
            "reviewer_actor": ACTOR,
            "user_factual_review_claimed": False,
            "parent_factual_review_pending": True,
            "native_reviewer_event": False,
            "verification": "Exact manufacturer article-body excerpts and raw/text SHA-256; no comments or complete guide text used as claims.",
        },
        "explicit_unknowns": {
            c["field"]: None for c in claims if c["status"] == "unknown"
        },
        "claims": claims,
    }


def activate(name):
    output = ROOT / "reports" / name
    if Path(name).name != name or not name.endswith(".json") or output.exists():
        raise ValueError("New report basename required")
    store = Store()
    try:
        before = store.stats()
        prior = dict(
            store.db.execute("SELECT record_key,revision FROM records WHERE active=1")
        )
        backup = ROOT / "exports" / (Path(name).stem + "-before.sqlite3")
        assert not backup.exists()
        db = sqlite3.connect(backup)
        try:
            store.db.backup(db)
        finally:
            db.close()
        record = prepare(store)
        result = store.ingest([record], actor=ACTOR)
        for key, revision in prior.items():
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
            "preserved_existing_records": len(prior),
            "backup": str(backup),
            "record_key": "N15",
            "native_approvals": 0,
            "user_factual_review_claimed": False,
            "source_guide_or_faq_text_indexed": False,
            "listeners_started": False,
        }
        with output.open("x") as f:
            f.write(json.dumps(report, indent=2) + "\n")
        print(json.dumps(report["after"]))
    finally:
        store.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--report", required=True)
    activate(p.parse_args().report)
