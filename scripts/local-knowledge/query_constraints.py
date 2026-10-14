"""Conservative intent boundaries for a source-reference corpus, not live commerce."""

import re

_TARGETS = {
    "surface": {
        "plate",
        "plates",
        "surface",
        "surfaces",
        "sheet",
        "sheets",
        "brand",
        "brands",
        "coating",
        "coatings",
        "pei",
    },
    "hotend": {
        "hotend",
        "hotends",
        "printer",
        "printers",
        "model",
        "models",
        "nozzle",
        "nozzles",
    },
}
_ADVICE = {"tips", "advice", "help", "guidance", "suggestions", "recommendations"}


def universal_scope_requested(question, kind):
    words = re.findall(r"[a-z0-9]+", question.lower())
    for index, word in enumerate(words):
        if word in ("universal", "universally"):
            return True
        if word not in ("all", "any", "every"):
            continue
        following = words[index + 1 : index + 7]
        if following and following[0] in _ADVICE:
            continue
        if any(target in following for target in _TARGETS[kind]):
            return True
    return False


def live_commerce_requested(question):
    q = question.lower()
    if re.search(
        r"\b(?:in[\s-]*stock|physical stock|store\s+pric(?:e|ing)|our price|sale price|current price|available to buy)\b",
        q,
    ):
        return True
    if re.search(r"\b(?:price|pricing)\b", q):
        return True
    if re.search(r"\bquote\b", q) and not re.search(
        r"\b(?:source|citation|quoted text|quotation|cite|excerpt)\b", q
    ):
        return True
    if re.search(r"\bhow much\b.*\bcost\b", q):
        return True
    return bool(
        re.search(r"\b(?:ship|shipping|dispatch|deliver|delivery)\b", q)
        and re.search(r"\b(?:today|tomorrow|now|when|to|price|cost)\b", q)
    )


def nozzle_interchangeability_requested(question):
    q = question.lower()
    return bool(
        re.search(r"\bnozzles?\b", q)
        and re.search(r"\b(?:hotends?|heater blocks?|k1|k1c|k2|revo|volcano)\b", q)
        and re.search(
            r"\b(?:interchangeable|interchangeability|fit|fits|compatible|compatibility|work|works)\b",
            q,
        )
        and universal_scope_requested(q, "hotend")
    )


def part_reference_groups(question, claims):
    """Resolve exact public part identities, without selecting physical store variants."""
    parts = set(re.findall(r"\b\d{10}\b", question))
    return sorted(
        {
            claim["group_key"]
            for claim in claims
            if (claim.get("group_key") or "").startswith("prior_")
            and claim["status"] == "supported"
            and isinstance(claim["value"], str)
            and claim["value"] in parts
        }
    )


def requested_part_fields(question):
    q = question.lower()
    fields = []
    if re.search(r"\b(?:voltage|volts?)\b", q):
        fields.append("voltage_v")
    if re.search(r"\b(?:wattage|watts?|heater power)\b", q):
        fields.append("heater_power_w")
    if re.search(r"\b(?:maximum|max|operating)\b.{0,40}\btemperature\b", q):
        fields.append("max_operating_temperature_c")
    if re.search(r"\b(?:fit|fits|fitment|compatible|compatibility)\b", q):
        fields.extend(
            [
                "verified_fitment",
                "verified_all_model_fitment",
                "verified_fitment_and_geometry",
                "verified_fitment_and_mounting",
                "verified_fitment_and_material",
                "verified_fitment_and_quantity",
                "connector_and_pcb_compatibility",
            ]
        )
    return fields
