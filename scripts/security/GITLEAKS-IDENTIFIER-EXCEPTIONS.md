# Exact catalogue identifier exceptions

The 14 October 2026 approval covers 53 inspected non-secret assignments in five
files at source commit `3f4850499d9a8c744b8237b980b3211cc53ac7c7`. The frozen
[approval inventory](fixtures/gitleaks-approved-identifiers.json) records each
source file hash, line, field and full-match hash. The fresh baseline scan
reproduced exactly those 53 findings before this policy change.

| Approved file | Assignments |
| --- | ---: |
| `apps/storefront-v3/src/app/api/ai-shopping-assistant/local-product-registry.generated.ts` | 42 |
| `scripts/local-knowledge/evaluation/catalogue100-materials-02.json` | 5 |
| `scripts/local-knowledge/evaluation/catalogue100-hardware-01.json` | 4 |
| `scripts/local-knowledge/test_catalogue100_corpus.py` | 1 |
| `scripts/local-knowledge/test_price_followup.py` | 1 |

`.gitleaks.toml` extends only the existing `generic-api-key` rule. Each of its five
new allowlists requires `condition = "AND"`: an anchored exact file path and one
escaped, anchored exact full scanner match. `regexTarget = "match"` prevents a
permitted identifier elsewhere on a line from exempting another finding. This
uses the [Gitleaks 8.24.3 rule-local configuration](https://github.com/gitleaks/gitleaks/blob/v8.24.3/README.md#configuration).

No whole-file exception, broad identifier prefix, global rule disable, entropy
change or fingerprint-only ignore is added. Existing configuration and every
other rule remain unchanged. The same exact approved assignment elsewhere in its
exact approved file also qualifies; different values and files are evaluated by
the existing detector. This does not assert detection of every possible secret.
The separate dependency audit, braces check and all required CI gates remain
unchanged.

## Regression checks

The standard-library Python harness requires an already installed Gitleaks
8.24.3 binary. It refuses changed approved source bytes or a changed baseline
policy, and creates a new output directory rather than overwriting evidence.
It generates synthetic alphanumeric values at runtime, with no credentials,
authentication attempts, network calls or dependency installs. All scanner
reports are redacted. Six tests verify:

- All 53 assignments are detected by the old policy and excluded by the new one.
- All 53 replaced values at the original locations remain detected.
- All 106 copies under prefixed or suffixed file paths remain detected.
- All 53 synthetic keys placed on the same lines remain detected.
- All 53 adjacent synthetic keys, five GitHub-shaped tokens and five curl bearer
  values remain detected; results match the unchanged baseline for these values.
- The parsed policy differs only by the five exact allowlists on the one rule.

From the repository root, choose a new SSD output path:

```sh
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin \
  PYTHONDONTWRITEBYTECODE=1 \
  TMPDIR=/Volumes/MINI-M1/Codex/3dbyte-tech-store/tmp \
  python3 -B scripts/security/test_gitleaks_exceptions.py \
  --gitleaks /Volumes/MINI-M1/Codex/3dbyte-tech-store/tools/gitleaks/8.24.3/gitleaks \
  --output /Volumes/MINI-M1/Codex/3dbyte-tech-store/tmp/gitleaks-identifier-tests-new
```

Run the existing full source scan from the source root so relative file paths
match CI: `gitleaks dir . --config .gitleaks.toml --redact --exit-code 1`.
Changes to the approved identifiers or paths need a new inventory and scope
review; do not broaden expressions simply to make a scan pass.
