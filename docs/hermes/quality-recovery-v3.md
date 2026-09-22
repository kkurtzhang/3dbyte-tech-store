# AI Product Draft quality and recovery (v3)

## Release boundaries

Deploy the backend/Admin change through the staging PR pipeline. Run the existing Medusa database migration step: the bundled PostgreSQL locking provider has its own table migration. Draft mutations explicitly use its transaction-scoped advisory locks, shared between server processes. See [Medusa provider documentation](https://docs.medusajs.com/resources/infrastructure-modules/locking/postgres).

Install the updated `docs/hermes/skills/*/SKILL.md` and v3 schema into the actual Hermes research runtime separately. Repository changes alone do not update a running Hermes agent. Keep the existing intake token private and unchanged. No new model dependency or model swap is required.

V1/v2 packets remain accepted for historical intake compatibility, but all approval/import paths reject them. Existing stored rows are not silently rewritten. Their old percentages are hidden in the Admin in favor of “Research required”. Historical imports are preserved for a separate product/CMS audit.

## Evidence contract

Use `product-research-packet.v3.schema.json` and the synthetic fixture. Classification must be explicit and supported by an exact-product HTTPS source and a short excerpt. No kind is inferred from a title alone. Unknown facts have a null value, never invented false/zero defaults. Each known fact has field-specific values/units, an applicability flag, cited source IDs, a short excerpt, confidence and an optional caveat. The backend additionally validates range ordering and cross-field semantics beyond JSON Schema.

Required minimum facts:

| Kind | Required facts |
| --- | --- |
| filament | material, diameter_mm, recommended_nozzle_temp_c, recommended_bed_temp_c |
| hotend | max_temperature_c, compatible_printers |
| nozzle | material, nozzle_diameter_mm, thread |
| build_plate | material, dimensions_mm, compatible_printers |
| extruder | compatible_printers |
| sensor | compatible_printers, connector_type |
| controller | voltage_v, connector_type |
| motor | voltage_v, current_a |
| fan | voltage_v, dimensions_mm, connector_type |
| power_supply | voltage_v, current_a, power_w |
| tool | material |
| hardware | material, dimensions_mm |
| accessory | compatible_printers |

Do not force a product into a category just to avoid required research. If the taxonomy cannot describe it correctly, extend the contract and regression fixtures before onboarding it. A hotend's maximum operating temperature is not a filament print setting. When official requirements are unavailable, leave the draft blocked instead of inventing them.

Every nonempty description, SEO field, feature bullet and keyword requires its own evidence path. Sources marked family/background, missing excerpts, confidence below 0.8, or caveated known claims block approval. The threshold is a conservative triage rule, **not calibrated accuracy**. The Admin shows supported/required fact counts and supported/nonempty copy counts, not model accuracy. Related article confidence and arbitrary document defaults are excluded from quality scoring. Human source verification remains mandatory.

## Safe backlog recovery

1. Before any live replacement or cleanup, take a restricted database backup and an inventory export including raw/normalized packets, events, status, linked products, import progress and CMS document IDs. Retain it outside the repository. Do not delete first.
2. Review the inventory for exact-product duplicates and variants. Names are candidate matches, not automatic merge authority. Choose one canonical research job per exact product; keep an explicit old-ID to canonical-ID manifest.
3. Pilot fresh research on a hotend, filament, power supply, build plate and accessory. Use exact manufacturer evidence. Do not mechanically wrap old claims in v3 envelopes.
4. Open the pending draft, expand “Replace with freshly researched v3 packet”, paste valid research, and confirm. Keep the exact product name/variant and existing request ID. The Admin saves the complete previous draft as a `research_replacement_backup` event before writing. Stale review hashes, different identities, approved records and partial/completed imports are rejected. Failed validation leaves the original unchanged. A backup event without a subsequent completion event indicates an interrupted attempt, not a successful replacement.
5. Review identity matches, every source excerpt, copy, documents and selected metadata. Resolve catalogue ambiguity. Acknowledge the source review, then approve. Approval stores a hash of research, normalization, proposed changes, operation and product snapshot. Import rechecks it before side effects. Keep imported products unpublished until commerce data and CMS content are reviewed.
6. Verify each pilot in Medusa and Strapi before extending to the remaining queue. New AI shells have an `ai_product_draft_id` marker so automatic product-created synchronization cannot race to create a blank CMS description. Multiple existing CMS document IDs block import rather than selecting one arbitrarily.
7. Audit the three historical imports independently. Reconcile existing CMS document identities through the approved Strapi Admin/API workflow with a backup; never delete a document merely because it is unpublished. Preserve any reviewed copy and document links.
8. Only after the canonical replacements have passed review, reconcile every old ID in the manifest. Reject superseded pending duplicates with the canonical draft ID as the reason, then use recoverable cleanup if desired. Do not bulk-remove all legacy drafts before replacement quality is verified.

Recovery is forward-only: preserve prior research in events, then submit a corrected v3 packet for unimported drafts. Do not restore old approved/importable state. Imported product/CMS rollback is a separate audited operation, not a research-replacement action.

The old `migrate-ai-product-drafts` script is a historical v1/v2 identity repair, not a quality upgrade. Its preparation helper excludes v3 and newer packets. Single and bulk cleanup share the research mutation locks; bulk cleanup rechecks the exact selected set after acquiring them and aborts if it changed.

## Acceptance checks

- The reported Creality hotend cannot be approved with its legacy 0–300°C filament-print setting.
- A sourced v3 hotend proposes `product_kind: hotend` and `max_temperature_c`; no filament-only settings.
- An empty or weak packet remains blocked even if its model reports high confidence.
- Direct approval/import requests cannot bypass the quality check, review acknowledgment or hash.
- Replacing research preserves the original event snapshot and requires a new approval.
- Repeated imports reuse persisted progress and do not create a competing CMS placeholder.
- Confirm these behaviors on the deployed staging SHA before declaring the live issue fixed.

## Local verification and outstanding rollout work

Validated on the `fix/ai-draft-quality` worktree:

- Backend unit suite: 612 tests across 147 suites passed, including approval/import/recovery regressions. Production backend/Admin build passed.
- Focused quality-module coverage: 89.74% statements, 84.21% branches, 100% functions, 94.8% lines. This is not repository-wide coverage.
- Browser checks of the actual built Admin with synthetic, read-only fixtures: legacy approval/import blocked; supported v3 research requires source acknowledgment; review guidance and evidence layout verified. The local fixture server refuses mutation requests.
- The authenticated staging hotend page was inspected separately and still displayed the old confidence and inappropriate filament settings. Local checks do not establish deployed behavior.

Validation gaps: no live PostgreSQL/Strapi integration test or real v3 pilot import has been performed. The standalone full TypeScript check has pre-existing failures outside the changed production paths (instrumentation, SDK module mode, bundled-product types and historical migration tests); the production build is the checked release gate. Dependency audit reports 50 existing production advisories, including 2 critical and 12 high; this change adds no dependencies and does not remediate that baseline.

Remaining: PR/deployment, install the Hermes runtime skill/schema update, restricted backup and fresh inventory, the five-category research pilot, deployed approval/import verification, historical CMS reconciliation, then staged backlog recovery and cleanup. No live draft replacement, deletion, product publication or CMS write was performed during implementation.
