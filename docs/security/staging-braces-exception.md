# Temporary staging braces risk acceptance

Owner: Kurt. Approved explicitly in the release conversation (approval message
`Sentinel_b6382be2f6248191bd690f481a1976e2`).

- Advisory: **GHSA-vfj7-8cjw-p6xm** (CVE-2026-93687), braces stack-exhaustion denial of service.
- Expiry: **2026-10-21 00:00:00 UTC** (21 October, 11 am Melbourne).
- Scope: GitHub Actions in `kkurtzhang/3dbyte-tech-store`, pull-request merge
  refs targeting `staging`, and pushes to `refs/heads/staging`.
- Rationale: temporarily accept the unresolved advisory to release the tested
  combined staging work while an upstream-compatible remedy is pursued.
  This does not establish exploitability, verify the local braces patch, or fix
  the vulnerability. No official patched release was listed when approved.

## Enforcement

`.github/scripts/staging-audit-exception.mjs` invokes the exact existing command:
`pnpm audit --audit-level=high`. Only eligible, unexpired CI runs temporarily add
the exact advisory to `package.json` → `pnpm.auditConfig.ignoreGhsas`, after the
frozen-lock install. Existing advisory/CVE ignores and all other settings remain
intact. Original manifest bytes are restored on success, audit failure, process
startup error, SIGINT and SIGTERM. Restoration errors fail the job; the workflow
also checks that dependency manifests and lockfile remain unchanged.

Uncatchable termination (for example SIGKILL or runner loss) cannot execute
cleanup; only the disposable job checkout is affected. Nothing commits,
uploads or deploys its temporary manifest. Runtime builds use separate checkouts.

Local audits, production-targeted PRs, main pushes, tags, manual runs, privileged
pull-request events and other repositories do not receive this exception.
At or after expiry the helper runs the ordinary audit without the added ignore,
so remaining high/critical advisories block normally. The clock cannot be
overridden through an environment variable or CLI option.

Gitleaks, other high/critical advisories, registry errors, all quality checks and
branch protection remain enforced. The threshold and the two pre-existing GHSA
ignores have not changed. This exception suppresses this advisory for all braces
instances in eligible audits; it does not alter installed dependencies.
Expiry does not remove already deployed code.

## Review and removal

Review before expiry; no automatic extension is permitted. Remove the workflow
wrapper and this exception once a compatible remedy is installed and an
authorized fresh audit passes without this ignore, or when risk acceptance is
withdrawn. Any extension needs another explicit scope/deadline approval.
Preserve the existing audit command and all other checks.

Run the offline tests with:

```sh
node --test .github/scripts/__tests__/staging-audit-exception.test.mjs
```

The tests use fake audits and local manifests; they do not transmit dependency
data or test a braces exploit. The release audit's external transmission was
separately approved: dependency names, versions and relationships go to npm's
registry security service, without source code or credentials.

Sources:

- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://pnpm.io/10.x/cli/audit
