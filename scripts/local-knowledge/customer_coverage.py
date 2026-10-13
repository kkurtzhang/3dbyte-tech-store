"""Persisted guidance for explicit troubleshooting, process-stage and supplier-table questions."""

import json
import re
from query_constraints import live_commerce_requested


def coverage_intent(question, group):
    q = question.lower()
    if live_commerce_requested(q):
        return None
    if (
        re.search(r"3dmakerparts", q)
        and re.search(r"\bboms?\b|supplier.*hardware", q)
        and re.search(r"landy", q)
        and re.search(r"buggy|buggster|sandy", q)
        and not re.search(r"wes\d+|\b(?:guide|manual|faq)\b", q)
    ):
        return "N14", ["family_belts", "family_shocks"], []
    if group == "five_E04" or re.search(r"pa6[ -]?cf20", q):
        if re.search(r"certif|load rating|design rating", q):
            return "N13", [], ["finished_part_load_rating"]
        if "anneal" in q and re.search(
            r"other grade|different grade|pa12|pet.cf|pps.cf", q
        ):
            return "N13", [], ["other_grade_process_transfer"]
        if "anneal" in q:
            return "N13", ["drying_versus_annealing"], []
        if re.search(
            r"0[.]2\s*mm|minimum.*diameter|minimum.*nozzle|diameter.*minimum", q
        ):
            return "N13", ["hardware_minimum"], []
    if re.search(r"\bpla\b|\bmk3s?\b", q) and re.search(
        r"heat creep|fully closed|closed enclosure", q
    ):
        if re.search(r"\bmk4s?\b|core one|\b(?:k1|x1|ender)\b", q):
            return "N12", [], ["cross_printer_variant_applicability"]
        return (
            "N12",
            [
                "diagnostic_scope"
                if re.search(r"heat creep|prove|wet", q)
                else "pla_closed_enclosure"
            ],
            [],
        )
    return None


def answer_customer_coverage(store, question, group, result):
    intent = coverage_intent(question, group)
    if not intent:
        return None
    key, known, unknown = intent
    rows = {
        json.loads(row["payload"])["field"]: (row, json.loads(row["payload"]))
        for row in store.rows()
        if json.loads(row["payload"])["record_key"] == key
    }
    if not rows:
        return None
    if unknown:
        assert all(
            field in rows
            and rows[field][1]["status"] == "unknown"
            and rows[field][1]["value"] is None
            for field in unknown
        )
        return {
            **result,
            "status": "unknown",
            "reason": "source_scope_not_verified",
            "unknown_fields": unknown,
            "context_pack": [],
            "answer": "The captured source scope does not establish the requested finished-part rating, cross-grade recipe or cross-printer applicability. Retain the named field as unknown.",
        }
    pack = []
    for field in known:
        row, claim = rows[field]
        citations = [store.cite(c) for c in claim["citations"]]
        if not citations or not all(citations):
            return {
                **result,
                "status": "unknown",
                "reason": "coverage_source_invalid",
                "unknown_fields": known,
                "context_pack": [],
                "answer": "The source bytes or exact excerpts for this guide are unavailable or changed.",
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
        "reason": "scoped_customer_coverage",
        "context_pack": pack,
        "answer": "\n".join(x["statement"] for x in pack),
    }
