"""Named source-family selection. Does not establish supplier-variant fit."""

import re


def nozzle_family(question):
    q = question.lower()
    revo = bool(re.search(r"\brevo\b.*\bbrass\b.*\bnozzle", q))
    v6 = bool(re.search(r"\bv6\b.*\bhardened[\s-]+steel\b.*\bnozzle", q))
    return (
        "revo_brass"
        if revo and not v6
        else "v6_hardened_175"
        if v6 and not revo
        else None
    )
