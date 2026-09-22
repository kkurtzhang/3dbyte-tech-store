# September 2026 staging dependency remediation

The release gate is `pnpm audit --audit-level=high`, covering all workspaces and
development dependencies. Do not change the threshold or add advisory ignores.

## Reproduced failure

At `f897bf0b6`, the command exits 1 with 2 critical and 13 high advisories
(51 total, including 7 low and 29 moderate). PR #232's security job reproduced
the same failure. Its other CI jobs passed.

| Dependency | Before | Patched version |
| --- | --- | --- |
| next / @next/mdx | 16.2.11 | 16.3.3 |
| @faker-js/faker | 10.1.0 | 10.6.0 (minimum 10.5.0) |
| nodemailer | 9.0.1 | 9.1.1 |
| browserslist | 4.28.1 | 4.28.7 |
| fast-uri | 3.1.5 | 3.1.6 |
| js-yaml | 4.3.1 | 4.3.2 |
| sharp | 0.35.0 | 0.35.4 |
| multer | 2.2.0 | 2.3.0 |

Versions and supported Node/React engines were checked against npm metadata.
Next and sharp's image-processing fixes are described in the
[Next advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) and
[sharp release](https://github.com/lovell/sharp/releases/tag/v0.35.4).
The [Nodemailer release](https://github.com/nodemailer/nodemailer/releases/tag/v9.1.1)
also addresses its related content-resolution issue.

## Verification plan

Use the existing audit command as the failing regression check. Upgrade direct
dependencies and the repository's existing bounded transitive overrides, then
regenerate the lockfile. Verify a frozen install, repeat the audit, run application
tests and builds, and require all PR checks to pass before normal staging merge.
Record the deployed commit, service health and relevant browser behavior after
deployment.

## Remediation results

The unchanged audit command now exits 0: zero high and zero critical advisories.
The remaining audit findings are 25 moderate and 6 low (3 ignored by the existing
configuration). No advisory exclusions or CI thresholds were changed.

`CI=true pnpm install --frozen-lockfile` passed. The storefront's 1,064 tests and
its critical-coverage gate passed. The updated lockfile includes platform-specific
Next/sharp artifacts, current browserslist data, and Next's SWC helper update.
Backend tests and the complete PR build/smoke gates must pass before deployment.

### Next 16.3 build compatibility

CI run 35721321808 passed security, unit tests, lint, shared type checks and browser
smoke. The storefront build failed because the new CLI type-checker includes Jest
fixtures. Next 16.2's `runTypeCheck.js` explicitly filtered `__tests__`, `__mocks__`
and `*.test.*` / `*.spec.*` diagnostics. Every reported error is in a test file.
The upgrade therefore needs an explicit production TS configuration preserving
that former scope. Keep `strict` and production type checking enabled; run Jest
and coverage with the unchanged test configuration.
