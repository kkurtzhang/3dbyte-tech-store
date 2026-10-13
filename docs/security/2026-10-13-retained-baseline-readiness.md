# Retained Medusa baseline readiness

**Compatible remediation is locally reviewable; staging release remains blocked
by the required braces high-advisory gate.** The user deferred the Medusa upgrade.
Medusa stays 2.15.5 and Strapi stays 5.48.1. No proposed public-data contract or
2.21 change is applied to this baseline.

Dependency remediation: `859382b884b2c6158fe705edbf6919aa46231b14`, built on
integrated `3f55081b4e3ef9a9ac538fd369411c57719b32c6`. This follow-up is on
`fix/non-braces-baseline-readiness-20261013` in the isolated SSD remediation
checkout. Original 859, evaluation 8d48b223 and contract experiment 0beed351 stay
on their preserved branches. Publication awaits parent coordination.

## Changes and retained commerce behavior

The new native Medusa 2.15 fixture applies migrations/links only to a disposable
synthetic PostgreSQL database on loopback port 65442, with the same guarded SSD
controller pattern used for the separate framework evaluation. It confirms:

- Existing product list/by-handle selectors return the preorder status/date and
  configured USD 80 preorder price against USD 120 regular pricing.
- Existing bundle selectors return the own bundle link and included component
  product titles; listing can identify the bundle. The known-ID detail route and
  component lookup work. No new fields or access permissions are added.
- Existing cart workflows charge preorder quantity 2 at 80 (total 160), and a
  separate ordinary bundle's two components at 80 (total 160), with regular
  comparison price 120. Existing preorder relations reach cart retrieval.
- React DOM tests consume these actual responses: preorder action is enabled,
  date/price messaging remains, cart/checkout displays charged and regular
  amounts, and bundle selection sends its native IDs to the existing cart flow.

The new rendering test reproduced an inherited display gap: native cart
retrieval does not materialize the non-star `items.variant.prices` selection,
so cart analysis reported zero bundle savings despite the existing
`bundle_regular_unit_price` receipt metadata. The small consumer fix falls back
to the existing price helper only when regular variant pricing is absent.
Existing variant pricing takes precedence; preorder discount is not counted as
bundle savings without its standalone preorder price. No query/metadata writer,
server pricing, preorder/bundle model, authorization, stock check or checkout
workflow changes.

## Previous versus newly verified checks

| Evidence                                                                 | Result                                                                                        | Rerun policy                                                           |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Previous 859 backend suites                                              | 743 tests / 157 suites PASS                                                                   | Carried forward; no backend production change                          |
| Previous 859 storefront suites                                           | 1086 tests / 174 suites PASS                                                                  | Preserved original result                                              |
| Previous 859 observability and dependency consumer checks                | 15 + 21 + 6 tests PASS                                                                        | Carried forward; dependencies unchanged                                |
| Previous 859 backend/Admin, CMS and shared builds/types; frozen install  | PASS                                                                                          | Carried forward for unchanged workspaces/graph                         |
| New Medusa 2.15 native HTTP scenario                                     | PASS; existing selectors, migrations, preorder/bundle/cart pricing                            | Newly checked baseline boundary, not repeated old unit work            |
| New receipt/action rendering and savings regressions plus affected tests | 33 PASS: 6 new frontend cases, 27 affected existing cases                                     | Relevant cart-analysis production change                               |
| Changed cart-analysis coverage                                           | 97.22% statements, 86.84% branches, 100% functions, 97.14% lines                              | Focused on changed logic                                               |
| Unchanged critical storefront gate                                       | 1092 tests / 175 suites PASS; 87% statements, 81.78% branches, 92.51% functions, 87.76% lines | Run once for the cart production change; no separate full-suite repeat |
| New fixture backend/Admin/frontend types; final frontend types           | PASS                                                                                          | Newly added tests and changed source                                   |
| Storefront production build                                              | PASS                                                                                          | Relevant source change; Node 22.22.1 isolated runtime                  |
| Targeted frontend fixture lint                                           | Config ignores TSX; no coverage claimed                                                       | Inherited lint configuration unchanged; types/build checked            |

The HTTP/response-rendering suites are explicitly opt-in, so ordinary unit
commands do not start a database. The fixture container and its owned volume
were removed. Logs and caches stay on the external SSD. New checks do not prove
full browser/payment/order-completion or inventory-managed fulfillment E2E.
The fresh fixture uses unmanaged synthetic stock and USD prices; previous AUD
and guard evidence belongs to its original snapshots. No staging/live data or
knowledge databases were used.

## Remaining compatible package fixes

The current manifests and lockfile are identical to 859. Lock SHA-256:
`25f21cb74e8c5ea4f1fed5a007f8ecb077b591cf7366d8877286d48e3bae2486`.
No audit was rerun because the dependency graph did not change. Public registry
GETs sent only package names plus one GitHub advisory ID, without credentials,
source or a dependency graph. The saved official metadata supports these limits:

| Remaining package                    | Checked fix / compatible blocker                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React Router 6.30.6, two advisories  | Require 7.18.0+; current Medusa/Strapi router peers remain 6.x. No forced major override.                                                                                                                                                              |
| sanitize-html 2.17.5, two advisories | 2.17.7 fixes both but requires Node >=22.12.0; current CI is Node 20. Smallest separate next option: explicitly align Node baseline/CI with existing Node 22 runtime, then take this narrow patch. It needs no Medusa upgrade but is not applied here. |
| stream-json 1.9.1, three advisories  | Require 3.6.0; retained Strapi pins 1.9.1. Unsupported multi-major replacement avoided.                                                                                                                                                                |
| csv-parse 5.6.0                      | Require 7.0.2; Medusa 2.15.5 core-flows declares ^5.6.0. Deferred framework change would be needed for the checked supported parent path.                                                                                                              |
| selector-parser 6.x                  | New checked legacy release 6.1.4 is still inside the official advisory's <7.1.6 range. Tailwind 3.4.19 and postcss-nested 6 still require 6.x; typography 0.5.20 still pins 6.0.10. No removal can be claimed.                                         |
| Medusa PG instrumentation 0.52.0     | Require 0.73.0; the retained parent requires ^0.52.0 and only 0.52.0 exists in that line. Shared observability's fixed path does not clear this separate Medusa path.                                                                                  |
| i18next-http-backend 3.0.5           | Require 4.0.2; retained Dashboard pins the older major, already overridden before this work. No additional unsupported major substitution.                                                                                                             |
| sprintf-js 1.0.3                     | No fixed release identified by the saved advisory.                                                                                                                                                                                                     |
| Braces                               | High, unresolved, unchanged. This task did not perform exploit/stress/patch re-review.                                                                                                                                                                 |

There is no additional **package-only** advisory removal supported by the current
framework ranges and Node 20 CI. The sanitizer/Node option is a concrete separate
baseline decision, not a request to rebuild bundle/preorder features. No official
fix date or timeline is claimed.

Last approved audit at 859: **19 findings: 4 low, 14 moderate, 1 high**, zero
critical/info. Thirteen visible package/advisory entries include 12 non-braces
entries; three low metadata findings are filtered by unchanged existing ignores.
This is the October 13 snapshot, not complete current coverage. The October 8 CI
reported 56 (8 low, 3 ignored; 47 moderate; 1 high). Those are different graphs
and snapshots; the historical lower findings are not all claimed removed.

## Knowledge integration and shortest compliant staging path

Read-only snapshot of `worktrees/local-knowledge-chat-20261013`:
HEAD 3f55081; four modified tracked files (.env example, assistant route,
assistant drawer and its test). They have **zero overlap** with 859's ten changed
files. The tracked knowledge diff passes `git apply --check` against the
remediation checkout without applying it. Twenty untracked paths at the later
snapshot have no remediation path collision; their contents were not integrated
or runtime-validated. The knowledge task is ongoing, so these are snapshot
results, not a guarantee about its final commit. No knowledge file, database or
service was changed by this task.

GitHub read-only verification on October 13:

- Protected staging remains `8b9760b3e8d7016f369f8ed1416b7c7dda96cdf8`.
  Required contexts returned by the branch API: address-reindex-policy,
  e2e-smoke, lint, security-scan, type-check and test. Repository instructions
  additionally require all applicable CI jobs, including build/deployment-config.
- PR 235 remains draft at `7d255a33e66a23f2e8e3f377854a570c80dbdb05`;
  PR 236 remains draft at `4a4b4bb82bbdfa4c6e6a46fa7bd107efd922ad52`.
  Their latest CI runs 37847277435 / 37848479916 fail only security-scan;
  other CI jobs and companion environment-policy workflows pass.
- PR 236's saved security job 113555206158 fails the unchanged
  `pnpm audit --audit-level=high` step on braces GHSA-vfj7-8cjw-p6xm. Its source
  check/gitleaks and install steps pass. No scan was rerun to obtain this evidence.
- The retained integrated baseline descends from PR 236's head. PR 235's exact
  final head is not an ancestor, so do not blindly merge/cherry-pick both old PRs;
  coordinate the integrated candidate and their supersession with the parent.

Shortest compliant path:

1. Let the knowledge owner commit its finished snapshot on the existing 3f55081
   lineage. In a separate release integration branch, combine 859's dependency
   commit and this small follow-up with that exact knowledge commit. Recheck
   overlap and test the integrated candidate; never reset the active checkout.
2. Coordinate one staging PR/candidate that represents the chosen complete tree,
   keeping framework versions and all existing guards/checks. Current local
   branches are unpublished and have no exact-head remote CI result.
3. Resolve the braces blocker through its owning security work before the
   required high/critical gate can pass. No manual deployment, waiver, scanner
   threshold change or exception is an alternative to a passing gate here.
4. Require all exact-head checks green and completed, then merge through protected
   staging. Verify the post-merge push workflow. Lockfile/shared-package changes
   make this an **all-services** normal Coolify rollout, per the deploy runbook.
   Do not invoke the legacy manual `deploy-dev-stage` workflow: it resets to
   origin/main and is not the protected staging path.
5. Verify deployed releaseSha, healthy services and rendered knowledge/chat plus
   bundle/preorder/cart behavior. Business data/source approval and checkout
   activation remain governed by their existing native controls; code deployment
   is not evidence that reference products are approved purchasable offers.

**Deployable versus blocked:** local compatible code and a dry-run integration
are ready for coordinated review; a compliant staging release is blocked by the
braces high finding, draft/unpublished candidate state and final combined-head
checks. The extra moderate/low findings remain risks even though the present
security threshold blocks high/critical. The user can review local knowledge
work while these release gates remain enforced.

Evidence: `/Volumes/MINI-M1/Codex/3dbyte-tech-store/artifacts/non-braces-baseline-readiness-20261013`.
Relevant files: `runtime-responses.json`, `runtime-contracts.log`,
`runtime-fixture-cleanup.json`, `retained-ui-and-savings.log`, `savings-coverage.log`,
`retained-critical-gate.log`, `storefront-build-retained.log`,
`new-fixture-types.log`, `knowledge-integration-check.json`, `release-status.json`,
`registry/` and `advisories/`. The original approved audit and targeted-fix matrix
remain under `../non-braces-remediation-20261013`.

No source/report upload, new real credentials, push, merge, deployment, public
field permission expansion, release-gate edit or shared database write occurred.
