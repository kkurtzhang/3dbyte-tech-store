# Compatible dependency remediation — 26 October 2026

Base: staging `7b60a29800c1cd5b53363fc79146918ee4d8d645`.

The October 25 audit reported 3 critical and 17 high findings. This change
updates the affected packages within their existing major versions and retains
the application frameworks and API contracts. It is a partial remediation:
Zod v3 remains a release blocker, and the MCP SDK has an additional runtime
configuration requirement described below.

## Selected releases

| Consumer | Previous | Selected | Reason |
| --- | --- | --- | --- |
| Storefront Next.js and MDX | 16.3.8 | 16.4.1 | Two critical RCE advisories and Server Actions DoS; keep Next/MDX and the React type-peer extension aligned |
| Strapi DOMPurify | 3.4.16 | 3.4.17 | Shadow-root template sanitization and detached-node hook fixes |
| Strapi Markdown | 14.3.1 | 14.3.3 | Quadratic rendering and smartquotes fixes |
| Medusa HTTP redirects | 1.16.0 | 1.16.1 | Credential-header stripping fixes |
| Strapi MCP SDK | 1.31.0 | 1.32.0 | Session isolation fix and opt-in input limit support |
| Medusa/Strapi Vite | 6.4.3 | 6.4.4 | Embedded launch-editor security fix |
| Medusa GraphQL Tools utils | 12.0.1 | 12.0.2 | Reject non-primitive incremental-result path segments |
| Express body-parser v1 | 1.20.6 | 1.20.9 | Compressed-body teardown fix |
| Express body-parser v2 | 2.3.0 | 2.4.0 | Same fix, preserving the separate v2 consumer line |
| Medusa Multer | 2.4.0 | 2.5.0 | Pending file-filter teardown fix |
| Strapi Undici | 6.28.1 | 6.29.1 | Excessive content-encoding error handling |
| Medusa admin-sdk/dashboard/deps Zod | 4.2.0 | 4.6.6 | Collection validation resource bounds; overrides target only these v4 consumers |

Release metadata and engines were checked against the npm registry; affected
and fixed ranges were checked against GitHub's reviewed advisories. New
transitive packages in the lockfile follow these selected releases. No broad
framework upgrade, new advisory ignore or risk waiver is included.

## Fresh audit results

Commands use pinned pnpm 10.32.1 with the two existing unrelated GHSA ignores.
The braces patch and expired staging exception are unchanged, and braces is
not ignored. GitHub withdrew its advisory on October 23; npm no longer returns
it in either scope.

| Graph | Critical before → after | High before → after | Moderate before → after | Low before → after |
| --- | --- | --- | --- | --- |
| Full | 3 → 0 | 17 → 2 | 29 → 23 | 9 → 6 |
| Production | 3 → 0 | 17 → 2 | 28 → 22 | 9 → 6 |

`pnpm audit --json` and `pnpm audit --prod --json` both exit 1. Counts are
pnpm metadata counts, not unique advisory IDs. Production classification does
not demonstrate that an advisory is reachable from a deployed request.

The remaining high finding is [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5):

- `zod@3.25.67`, including `apps/cms > @strapi/content-manager > zod`.
- `zod@3.25.76`, including the storefront's direct Zod dependency.

The advisory's first fixed release is 4.6.6; no compatible v3 fix is published.
A blanket v4 override would change v3 schema APIs and third-party peer contracts.
The remaining choices are an explicitly scoped v4 migration of the storefront
and compatible Strapi consumers, or an upstream v3 backport. The ordinary
high-severity gate remains blocking; it is not bypassed by this PR.

## MCP runtime limitation

[GHSA-46jr-4wx8-v453](https://github.com/advisories/GHSA-46jr-4wx8-v453)
explicitly says upgrading alone does not enable its mitigation. SDK 1.32.0 adds
`maxToolInputElements`, disabled by default; HTTP/parser request limits must
also be appropriate. The installed Strapi 5.48.1 MCP handler authenticates
requests, creates its server internally and passes a previously parsed request
body to the transport. Application source does not construct `McpServer`.
This dependency update does not change that framework-owned configuration or
establish the deployed endpoint's exposure. An upstream Strapi integration or
a separately reviewed integration change is needed before claiming this runtime
mitigation is enabled. The existing in-memory SDK tool/OAuth compatibility tests
pass without external requests.

## Verification

- Frozen-lock installation succeeds with lifecycle scripts disabled; the
  existing Medusa CLI patch is applied explicitly before build verification.
- Seven targeted checks fail against the old locked packages and pass after
  updating: the Next release guard, DOMPurify shadow/detached-node cases,
  GraphQL path coercion and redirect header stripping.
- All 79 dependency regressions pass; nine additional upload, Markdown and
  React type-peer compatibility checks pass.
- Storefront lint and 189 unit suites pass (1,559 tests; four existing skips).
- Backend unit tests pass: 182 suites / 1,066 tests, with five suites / 26
  tests skipped where local fixtures are unavailable or already disabled.
- Medusa server/Admin, Strapi server/Admin and Next.js production builds pass
  with synthetic local configuration and loopback service URLs.
- All workspace type checks pass after generating Medusa container declarations;
  the fresh worktree initially lacked those generated declarations.
- The CI quality contract passes. The PR test job now runs the dependency suite.
- Hosted CI results and service-backed coverage are recorded in the PR.

No secrets or real provider calls are required by these checks. No merge or
deployment is part of this change. Local checks use Node 22.23.3 on macOS;
hosted CI uses Node 20 on Ubuntu and remains the release authority.

Sources: [Next image optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw),
[Next cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr),
[DOMPurify shadow roots](https://github.com/advisories/GHSA-cg2g-xh64-v4q7),
[DOMPurify detached nodes](https://github.com/advisories/GHSA-mrv2-3pqr-j5jr),
[GraphQL path validation](https://github.com/advisories/GHSA-c4qx-w738-7hr3),
[withdrawn braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
