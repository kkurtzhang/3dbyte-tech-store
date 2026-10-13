"""Finite v1 answer selection from persisted scoped guides, including stored null boundaries."""

import json
import re
from query_constraints import live_commerce_requested, universal_scope_requested


def intent(question, group):
    q = question.lower()
    if live_commerce_requested(q) or (group or "").startswith("catalogue_"):
        return None
    if re.search(r"stringing.*(?:prove|confirm).*wet|(?:prove|confirm).*moisture", q):
        return "N10", [], ["confirmed_moisture_fault"]
    if (
        re.search(r"generic|any brand|unspecified|unnamed", q)
        and re.search(r"\bpla\b|\bpetg\b", q)
        and re.search(r"dry.*(?:temperature|cycle|duration)", q)
    ):
        return (
            "N10",
            [],
            [
                "unbound_filament_drying_temperature_c",
                "unbound_filament_drying_duration_hours",
            ],
        )
    if (
        re.search(r"pa6[ -]?cf20", q)
        and re.search(r"s4|100c|100°c|100\s*°?\s*c", q)
        and re.search(r"dry|cycle", q)
    ):
        if "s4" in q:
            return "N02", ["s4_cycle_limit"], []
    if (
        (group == "five_E04" or re.search(r"pa6[ -]?cf20", q))
        and "dry" in q
        and re.search(r"stor|humidity", q)
    ):
        return "N02", ["pa_drying", "pa_storage"], []
    if (
        (group == "five_E08" or "supergrip" in q)
        and re.search(r"applying|application|apply|cold plate", q)
        and not universal_scope_requested(q, "surface")
    ):
        return "N04", ["application"], []
    if "prusa" in q and re.search(r"sheet|satin|textur|smooth", q):
        if re.search(r"other brand|every|bambu|buildtak", q):
            return "N15", [], ["cross_brand_cleaner_compatibility"]
        if "acetone" in q:
            return "N15", ["sheet_acetone_limit"], []
        if re.search(r"ipa|alcohol|cleaner|clean.*cold|cold.*clean", q):
            return "N15", ["sheet_cold_ipa"], []
        if re.search(r"spatula|scrap|scratch|tool", q):
            return "N15", ["sheet_scraper_scope"], []
    return None


def answer_v1_guidance(store, question, group, result):
    selected = intent(question, group)
    if not selected:
        return None
    key, known, unknown = selected
    if unknown is None:
        return None
    row = store.db.execute(
        "SELECT payload FROM records WHERE record_key=? AND active=1", (key,)
    ).fetchone()
    if not row:
        return None
    record = json.loads(row[0])
    claims = {
        json.loads(r["payload"])["field"]: (r, json.loads(r["payload"]))
        for r in store.rows()
        if json.loads(r["payload"])["record_key"] == key
    }
    if unknown:
        assert all(
            field in record["explicit_unknowns"]
            and record["explicit_unknowns"][field] is None
            for field in unknown
        )
        return {
            **result,
            "status": "unknown",
            "reason": "v1_scope_or_diagnosis_unresolved",
            "unknown_fields": unknown,
            "context_pack": [],
            "answer": "The captured source scope does not establish the requested diagnosis, unbound grade profile or cross-brand maintenance procedure. Keep the named field unknown.",
        }
    pack = []
    for field in known:
        row, claim = claims[field]
        citations = [store.cite(c) for c in claim["citations"]]
        if not citations or not all(citations):
            return {
                **result,
                "status": "unknown",
                "reason": "v1_source_invalid",
                "unknown_fields": known,
                "context_pack": [],
                "answer": "The exact current source bytes or excerpts for this guide are unavailable or changed.",
            }
        pack.append(
            {
                **claim,
                "claim_id": row["id"],
                "statement": claim["text"],
                "citations": citations,
            }
        )
    return {
        **result,
        "status": "source_grounded_context",
        "reason": "v1_scoped_persisted_guidance",
        "context_pack": pack,
        "answer": "\n".join(c["statement"] for c in pack),
    }
