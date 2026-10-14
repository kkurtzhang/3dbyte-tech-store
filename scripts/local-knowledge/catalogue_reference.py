"""Select persisted product facts; dated retailer observations never imply live commerce."""

import json
import re

PREFIX = "catalogue_"

# These six persisted families share the same two manufacturer specification
# fields. This expands intent matching only; it adds no claims or source scope.
FIBERLOGY_SPEC_GROUPS = frozenset(
    "catalogue_c100_fiberlogy_" + suffix
    for suffix in ("abs", "absgf", "asa", "pctg", "pctgcf", "pctggf")
)
MANUFACTURER_SPEC_FIELDS = frozenset(
    ("manufacturer_print_temperature", "manufacturer_bed_temperature")
)


def catalogue_groups(question, store):
    groups = set()
    matched = []
    for row in store.db.execute("SELECT payload FROM records WHERE active=1"):
        record = json.loads(row[0])
        group = record.get("group_key") or ""
        if group.startswith(PREFIX) and any(
            re.search(pattern, question, re.I)
            for pattern in record.get("reference_aliases", [])
        ):
            groups.add(group)
            matched.append(record)
    for record in matched:
        parent = record.get("generic_parent_reference_group")
        if parent not in groups:
            continue
        identities = [
            json.loads(row["payload"])["value"]
            for row in store.rows()
            if json.loads(row["payload"]).get("group_key") == parent
            and json.loads(row["payload"])["field"] == "manufacturer_part_number"
        ]
        explicit_parent = any(
            re.search(r"\b" + re.escape(value) + r"\b", question, re.I)
            for value in identities
            if value
        )
        if not explicit_parent or re.search(
            r"\bfit\b|compatible|compatibility", question, re.I
        ):
            groups.discard(parent)
    return sorted(groups)


def answer_catalogue_reference(store, question, group, result):
    if not group or not group.startswith(PREFIX):
        return None
    claims = [
        (row, json.loads(row["payload"]))
        for row in store.rows()
        if json.loads(row["payload"]).get("group_key") == group
    ]
    dated_price = bool(
        re.search(r"dated|reference|observed|captured", question, re.I)
        and re.search(r"price|\baud\b", question, re.I)
    )
    unresolved = [
        claim
        for _, claim in claims
        if claim["status"] == "unknown"
        and not (dated_price and claim["field"] == "store_sale_price")
        and re.search(claim.get("query_pattern", r"(?!)"), question, re.I)
    ]
    if unresolved:
        fields = sorted({claim["field"] for claim in unresolved})
        return {
            **result,
            "status": "unknown",
            "reason": "catalogue_scope_unresolved",
            "unknown_fields": fields,
            "context_pack": [],
            "answer": "The captured reference does not verify "
            + ", ".join(fields)
            + ". Retain these fields as unknown; manufacturer family/package facts and dated retailer observations do not establish the received variant or a live store offer.",
        }
    guides = [x for x in claims if x[1]["status"] == "editorial_inference"]
    matched_guides = [
        x for x in guides if re.search(x[1]["query_pattern"], question, re.I)
    ]
    generic_specs = group in FIBERLOGY_SPEC_GROUPS and bool(
        re.search(
            r"\b(?:spec(?:ification)?s?|technical\s+(?:details|data))\b", question, re.I
        )
    )
    matched_facts = [
        x
        for x in claims
        if x[1]["status"] == "supported"
        and (
            x[1]["field"] in MANUFACTURER_SPEC_FIELDS
            if generic_specs
            else re.search(x[1]["query_pattern"], question, re.I)
        )
    ]
    choice_question = re.search(
        r"choose|choice|buy|select|consider|recommend|planning", question, re.I
    )
    selected = (
        matched_facts
        if generic_specs
        else (
            (matched_guides if choice_question else matched_facts)
            or matched_facts
            or matched_guides
            or guides
        )
    )
    # Limit to one persisted document, matching the storefront assembly contract.
    if selected:
        selected = [
            x for x in selected if x[1]["record_id"] == selected[0][1]["record_id"]
        ][:3]
    pack = []
    for row, claim in selected:
        citations = [store.cite(c) for c in claim["citations"]]
        if not citations or not all(citations):
            return {
                **result,
                "status": "unknown",
                "reason": "catalogue_source_invalid",
                "unknown_fields": [claim["field"]],
                "context_pack": [],
                "answer": "The source bytes or excerpt for this reference are unavailable or changed.",
            }
        pack.append(
            {
                **claim,
                "claim_id": row["id"],
                "statement": claim["text"],
                "citations": citations,
            }
        )
    if not pack and claims:
        return {
            **result,
            "status": "unknown",
            "reason": "catalogue_question_unresolved",
            "unknown_fields": ["requested_reference_details"],
            "context_pack": [],
            "answer": "The selected reference has captured source evidence, but the requested details are not verified within its recorded scope. No facts from another product or received revision can fill that gap.",
        }
    if not pack:
        return {
            **result,
            "status": "unknown",
            "reason": "catalogue_reference_unavailable",
            "unknown_fields": ["reference_identity"],
            "context_pack": [],
            "answer": "The selected reference is not registered in the local corpus.",
        }
    return {
        **result,
        "status": "source_grounded_context",
        "reason": "scoped_catalogue_reference",
        "context_pack": pack,
        "answer": "\n".join(x["statement"] for x in pack),
    }
