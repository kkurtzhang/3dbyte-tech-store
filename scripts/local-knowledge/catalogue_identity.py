"""Known held or adjacent catalogue identities must not borrow generic source context."""

import re

# These names were explicitly excluded by the bounded catalogue100 evidence review.
# Reinforced PA12 grades remain separate accepted identities.
UNVERIFIED_IDENTITIES = (
    r"\bfiberlogy\s+pa12\b(?![\s+\-]*(?:cf|gf)\s*(?:15)?\b)",
    r"\b3dlac\s+plus\b",
    r"\beddy\s+(?:usb|coil)\b",
    r"\brevo\s+(?:prusa\s+)?mini\b",
)


def unverified_catalogue_identity(question, store):
    if not any(re.search(pattern, question, re.I) for pattern in UNVERIFIED_IDENTITIES):
        return False
    # Keep this bounded review attached to the expansion corpus. The preserved v1
    # corpus has its own independent retrieval and evidence scope.
    return (
        store.db.execute(
            "SELECT 1 FROM records WHERE active=1 AND group_key LIKE 'catalogue_c100_%' LIMIT 1"
        ).fetchone()
        is not None
    )
