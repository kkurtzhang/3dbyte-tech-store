# Compatible dependency remediation — 26 October 2026

Base: staging `7b60a29800c1cd5b53363fc79146918ee4d8d645`.

The October 25 audit reported 3 critical and 17 high findings. This change
updates affected packages and includes the approved Zod v4 migration. The
storefront, first-party Strapi and Koa consumers now use 4.6.6; Strapi is
upgraded to the 5.52.3 patch line that includes its official v4 migration.
The remaining Koa consumers use narrow compatibility patches described below.
The MCP SDK still has an additional runtime configuration requirement.

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
| Storefront Zod / form resolver | 3.25.76 / 3.10.0 | 4.6.6 / 5.2.2 | Native v4 schema validation and typed resolver input/output inference |
| Strapi packages | 5.48.1 | 5.52.3 | Official first-party v4 migration from 5.52.2 plus its next patch release |
| Strapi koa-body / koa-session Zod | 3.25.76 | 4.6.6 | Version-scoped compatibility patches preserve the existing middleware and parser contracts |
| First-party Strapi Zod | 3.25.67 | 4.6.6 | Parent-scoped overrides advance the upstream 4.4.3 dependency within v4 |
| Strapi minimizer schema-utils | newly resolved 4.8.1 | 4.7.0 | Within its declared ^4.6.0 range; 4.8 requires webpack >=5.112 while Strapi selects 5.109.2 |

Release metadata and engines were checked against the npm registry; affected
and fixed ranges were checked against GitHub's reviewed advisories. New
transitive packages in the lockfile follow these selected releases. No new
advisory ignore or risk waiver is included. The superseded Strapi 5.48.1
update-notifier patch and its package-json override are removed because 5.52.3
ships both fixes; all existing CJS/ESM notifier regressions still pass. The
braces patch and exception are unchanged.

## Fresh audit results

Commands use pinned pnpm 10.32.1 with the two existing unrelated GHSA ignores.
The braces patch and expired staging exception are unchanged, and braces is
not ignored. GitHub withdrew its advisory on October 23; npm no longer returns
it in either scope.

| Graph | Critical before → after | High before → after | Moderate before → after | Low before → after |
| --- | --- | --- | --- | --- |
| Full | 3 → 0 | 17 → 0 | 29 → 23 | 9 → 4 |
| Production | 3 → 0 | 17 → 0 | 28 → 22 | 9 → 4 |

`pnpm audit --json` and `pnpm audit --prod --json` both exit 1. Counts are
pnpm metadata counts, not unique advisory IDs. Production classification does
not demonstrate that an advisory is reachable from a deployed request.

Before the v4 follow-up, PR commit `c6dd230` reported 0 critical / 2 high /
23 moderate / 6 low in full scope and 0 / 2 / 22 / 6 in production scope.
The first v4 follow-up (`2fa1d08`) reported 0 critical / 1 high / 23 moderate /
4 low in full scope and 0 / 1 / 22 / 4 in production. The middleware follow-up
was audited at 02:35 UTC on October 26 with 2,954 full / 2,665 production
dependencies. The unchanged ordinary high-severity gate exits **0**, explicitly
reporting that no staging exception applies. Its summary also reports one
existing ignored low finding. Full/production JSON audits still exit 1 because
moderate and low findings remain.

The last high finding, [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
is no longer returned. Both actual Koa consumers resolve genuine Zod 4.6.6,
and no standalone Zod 3 package or dependency edge remains in the lockfile.
The middleware package names and versions are unchanged; the code and generated
types are adapted to the patched upstream Zod implementation. This is not an
advisory ignore or a cosmetic package version change.

## Koa middleware compatibility patches

The published `koa-session@7.0.2` still uses v3 function-schema APIs. Forcing
v4 alone crashes on `.args()` at module load. The patch migrates those APIs in
TypeScript source and both CJS/ESM distributions, with declarations generated
against the actual Zod 4.6.6 package. A raw-array arity check runs before tuple
validation so omitted `any` arguments are rejected while explicit `undefined`
and extra arguments retain the v3 behavior. Codec prefaults preserve wrapped
default functions; store context fields remain optional. Sync/async callbacks,
`this` and rejected-Promise identity are tested. The existing `createSession`
handling of parsed options is preserved. Zod 4 errors use v4 issue shapes, and
infinite numeric options are now rejected; finite values and the `"session"`
max-age sentinel remain valid.

`koa-body@6.0.1` receives the v4 enum API and regenerated declarations. Its
parser, Formidable 2, legacy `Symbol.for("unparsedBody")` contract, and empty
body for excluded methods are unchanged. Upgrading directly to body 7 or 8
would also change these integration contracts. Even current Strapi 5.59.0
still selects body 6.0.1 and session 7.0.2, so broad upgrades do not solve this
safely. Version-scoped pnpm overrides supply the v4 dependency alongside the
patches; both packages' manifests identify the real selected dependency.

The two packages' declaration files are checked with `skipLibCheck: false`.
Sixteen regressions cover CJS/ESM schemas, bounded-collection validation, typed
callbacks, signed cookies/tampering, sync/async stores/logout, and actual Strapi
body parsing: JSON/raw/form/text, malformed input, size limits, multipart files
and cleanup. Baseline checks reproduced the two consumers still loading v3.
Independent review found no blocking defect and independently probed store
callbacks, rejection identity and array-default isolation. These local patches
need maintenance until upstream compatible releases replace them.

## Zod migration and consumer compatibility

The storefront directly pins 4.6.6. Local knowledge records now declare string
keys explicitly. Existing application error handling already uses `.issues`;
no `.errors` alias remains to migrate. The unsafe form-resolver cast is replaced
with the official v4-capable resolver, preserving inferred input and parsed
output types, defaults, transforms, and nested field errors. Existing auth,
checkout, support, assistant history and SDK tool regressions pass.

All 27 transitive Zod edges resolve 4.6.6: first-party Strapi,
Medusa, AI SDK/provider-utils/gateway/react/openai, MCP SDK, and
zod-to-json-schema peer contexts. AI/MCP compatibility adapters still import
legacy v3 subpaths for their supported v3 branches; the tested application
schemas take the v4 path. Package version alone is not proof of every branch's
runtime safety. The consumer regressions exercise real SDK conversion,
validation, and an in-memory MCP tool without calling a provider.

The security regression submits a small oversized fixture to constrained arrays
and confirms rejection before visiting elements, with positive and invalid
in-bound controls. It does not claim that every unconstrained schema is bounded.
The official [migration guide](https://zod.dev/v4/changelog),
[Strapi v4 migration release](https://github.com/strapi/strapi/releases/tag/v5.52.2),
[5.52.3 fixes](https://github.com/strapi/strapi/releases/tag/v5.52.3), and
[resolver output-type fix](https://github.com/react-hook-form/resolvers/releases/tag/v5.2.2)
informed the changes.

## MCP runtime limitation

[GHSA-46jr-4wx8-v453](https://github.com/advisories/GHSA-46jr-4wx8-v453)
explicitly says upgrading alone does not enable its mitigation. SDK 1.32.0 adds
`maxToolInputElements`, disabled by default; HTTP/parser request limits must
also be appropriate. The installed Strapi 5.52.3 MCP handler authenticates
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
  A separate empty-store frozen install confirms both Koa runtime/declaration
  patches apply from scratch, after regenerating a stale local patch entry.
- Seven targeted checks fail against the old locked packages and pass after
  updating: the Next release guard, DOMPurify shadow/detached-node cases,
  GraphQL path coercion and redirect header stripping.
- All 101 dependency regressions pass, including six Zod consumer checks
  and sixteen middleware checks.
  Three migration guards failed against the prior v3 consumers and pass now.
  React type-peer checks pass with the workspace type checks.
- Storefront lint and 190 unit suites pass (1,561 tests; four existing skips).
  The separate local-knowledge suites pass all 144 tests and now run in CI.
- Backend unit tests pass: 182 suites / 1,066 tests, with five suites / 26
  tests skipped where local fixtures are unavailable or already disabled.
- Medusa server/Admin, Strapi server/Admin and Next.js production builds pass
  with synthetic local configuration and loopback service URLs.
- All workspace type checks pass after generating Medusa container declarations;
  the fresh worktree initially lacked those generated declarations.
- The CI quality contract passes. The PR test job now runs the dependency suite.
- Hosted CI results and service-backed coverage are recorded in the PR.
- CMS database migration, live editorial workflows and provider integrations
  are not exercised locally. The CMS build, notifier startup, validation/error
  adapter and in-memory MCP compatibility checks pass without secrets.

No secrets or real provider calls are required by these checks. No merge or
deployment is part of this change. Local checks use Node 22.23.3 on macOS;
hosted CI uses Node 20 on Ubuntu and remains the release authority.

Sources: [Next image optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw),
[Next cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr),
[DOMPurify shadow roots](https://github.com/advisories/GHSA-cg2g-xh64-v4q7),
[DOMPurify detached nodes](https://github.com/advisories/GHSA-mrv2-3pqr-j5jr),
[GraphQL path validation](https://github.com/advisories/GHSA-c4qx-w738-7hr3),
[withdrawn braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
