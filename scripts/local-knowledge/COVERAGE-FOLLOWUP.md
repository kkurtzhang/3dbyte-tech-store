# Offline coverage follow-up

This follow-up completes the preserved two-file customer-coverage draft and adds two nonduplicate manufacturer-brand product references. It starts from the six-product commit `c9e6c17665284a0e144c45fe6f86691398d8671b` on the independent branch `fix/knowledge-coverage-followup-20261013`. The earlier integration snapshots and original approved packets are unchanged.

| Measure | Before this follow-up | After |
| --- | ---: | ---: |
| Local product/reference variant identities | 29 | 31 |
| Active source documents | 47 | 49 |
| Editorial guides | 21 | 26 |
| Active claims | 383 | 428 |
| Supported facts | 144 | 156 |
| Explicit unknown claims | 179 | 204 |
| Editorial inferences | 60 | 68 |
| Registered source versions | 88 | 98 |
| Native approvals | 0 | 0 |

The additions are **two product identities, two source documents, five guides, 12 supported facts, 25 explicit unknowns, eight editorial claims and ten new source versions**. Source review is performed by the Codex agent through the existing local `Store.ingest` mechanism; human factual review remains pending, and no native approval is claimed. There are 134 local review events after two additional source-proof refinements for the new CM2 records. All 68 records from the preceding milestone retain their revisions.

## Reconciled customer-coverage draft

The seven questions in `evaluation/customer-coverage-cases-v1.json` retain their original bytes. The original HTTP evaluator is archived byte-for-byte at `exports/customer-coverage-original-evaluator.py` in the SSD workspace. Its maintained repository version now validates **actual offline route streams** against persisted claim revisions and source evidence rather than opening an HTTP connection. No preview service is needed.

Three new guides address gaps not covered by the six product-selection guides:

- **N12 — PLA enclosure and heat creep:** [Prusa's article](https://help.prusa3d.com/article/extrusion-stopped-mid-print-heat-creep_1948) is scoped to MK2.5, MK2.5S, MK3, MK3S and MK3S+. It explains why closed, unventilated PLA printing and heatsink cooling are relevant checks. Heat creep is one possible clog mechanism, not a confirmed diagnosis or proof of a wet spool. Applicability to a named printer outside the article's scope remains unknown; no universal fan-RPM setting is promoted.
- **N13 — PA6 drying versus annealing:** [Fiberon PA6-CF20 TDS V1.1](https://fiberon.polymaker.com/wp-content/uploads/TDS_FIBERON-PA6-CF20_V1.1_EN.pdf), the captured exact-material product page and [Polymaker's annealing definition](https://wiki.polymaker.com/printing-tips/post-processing/annealing) distinguish filament drying at 100°C / 10 h from printed-part annealing at 100°C / 16 h. The manufacturer minimum of a 0.4 mm hardened nozzle excludes a 0.2 mm opening. The guide does not certify a finished bracket, transfer the recipe to other grades, resolve old bed/speed conflicts or verify an arbitrary dryer/spool.
- **N14 — RC supplier-family hardware:** Independently published 3DMakerParts hardware tables distinguish Buggy/Buggster/Sandy XL belts and 55 mm shocks from Landy HTD belts and 85 mm shocks. They do not bind exact WES2487/WES2488 contents, kit revisions or model releases. They are supplier component tables, not 3D Sets build instructions. Explicit build-guide/manual/FAQ requests retain the official link-only path.

These guides add six editorial claims and eight explicit unknowns, using four newly registered source versions and two previously verified manufacturer versions. The hardware evidence is limited to exact captured table rows. Original 3D Sets guide/FAQ text, diagrams and assembly instructions are not copied or indexed.

The current expanded corpus passed **1/7** of the unchanged draft cases before these guides and **7/7** after activation and routing fixes. This is deterministic customer coverage, not language-model quality evidence.

## New product identities and dated Australian references

| Exact reference | Official evidence | Australian listing | Dated observed AUD | Important unresolved scope |
| --- | --- | --- | ---: | --- |
| Magigoo PP, 50 mL retailer reference, SKU 5350583999921 | [Current Magigoo PP family](https://magigoo.com/products/magigoo-pp/) | [DREMC](https://store.dremc.com.au/products/magigoo-pp-50ml) | 39.95 | Current Glide PP wording versus exact legacy bottle/formula, manufacturer MPN, exact Fiberlogy grade and plate fit, damage-free release |
| Micro Swiss FlowTech CM2 0.4 mm, M2904-04 | [Manufacturer nozzle family](https://store.micro-swiss.com/products/micro-swiss-cm2-nozzle-for-flowtech-hotend) | [DREMC](https://store.dremc.com.au/products/micro-swiss-cm2-nozzle-for-flowtech%E2%84%A2-hotend) | 44.45 | V6/Revo/Unicorn/original-stock hotend fit, whole-printer temperature capability, every abrasive grade, other diameters or CHT variants |

Both prices were captured on **13 October 2026**, including GST, with shipping calculated separately. They are dated external listing observations, not live offers, inventory, delivery promises or 3D Byte Tech sale prices. Retailer own-brand products are excluded. Product/variant rows retain null prices and physical stock, checkout disabled and no selected physical supplier variant.

The Magigoo guide separates current family application/cooling guidance from proof about the actual AU bottle. The retailer's non-PP over-adhesion warning remains a retailer caution. It does not certify that a legacy Fiberlogy spool works with this exact bottle or that a plate cannot be damaged.

The CM2 variant is matched by **exact SKU and 0.4 mm option in both official and AU JSON**. The manufacturer describes a hardened M2 insert and a nozzle-only 450°C maximum. The existing current official M3101 package evidence supplies both its brass-plated default-nozzle excerpt and its 300°C hotend limit. The guide preserves that distinction: a nozzle rating does not increase an entire hotend/printer rating. A specific CM2 reference no longer inherits the generic FlowTech hotend alias, and a separately reviewed nozzle is not treated as a duplicate hotend identity.

Useful new questions include:

- Is the enclosure relevant when PLA stops extruding on a scoped Prusa printer?
- Does that symptom prove heat creep or a wet spool?
- Is PA6-CF20 spool drying the same operation as annealing a printed part?
- Does a 0.2 mm hardened nozzle meet the manufacturer's minimum diameter?
- Do supplier-family belt and shock differences prove the exact kit I will receive?
- Can Magigoo PP be substituted for a non-PP adhesive, and are current Glide instructions established for my older bottle?
- Which exact 0.4 mm FlowTech CM2 SKU fits the listed M3101 interface?
- Does a 450°C nozzle rating raise the whole hotend's temperature rating?

## Offline evaluation and evidence limits

`local-knowledge-coverage-offline.test.ts` runs the real chat handler. Its loopback fetch transport invokes the bounded Python retrieval bridge over stdin/stdout, so retrieval reads the actual dedicated corpus and validates source bytes. No socket, HTTP server or generation model is started. The Python evaluator independently compares emitted claim IDs, record revisions, statements, source scopes, exact citations and rendered source links with current persisted rows. Unknown answers must render no positive claim/source link.

Fifteen product questions were frozen before activation. The initial pre-activation stream capture stopped at a 503 before producing a complete baseline. A separate offline workspace copies the **actual pre-activation SQLite backup** without restoring, deleting or replacing the active corpus. Its source/clone SHA-256 and limitations are recorded in `reports/followup-baseline-recovery-v1.json`. The recovered snapshot baseline, using final route code, is **0/15**; current active data passes **15/15**. That recovered baseline is not a clean original-code before/after trial or an independent held-out measure.

The combined final stream/verification set is **22/22**: the preserved seven questions plus the 15 new product questions. Original six-product regressions remain scoped to their six original identities and remain passing. Review/replay tests confirm that unchanged seeds add no duplicate products, claims or review events. A final cross-product proof refinement updates only the two newly added CM2 records; the previous milestone's 68 records remain pinned.

Reports, immutable raw/text versions, backups, caches and the isolated baseline copy remain on the external SSD. The new compact receipt is `evaluation/coverage-followup-receipt-v1.json`. Five previously lost historical raw captures remain unavailable; they are not reconstructed or cited by active new claims.

## Reproduce without starting preview

Use the cleared environments and SSD runtime paths documented in `README.md` and `CATALOGUE-EXPANSION.md`. From `apps/storefront-v3`, set:

```sh
KB=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013
NODE_DIR=/Volumes/MINI-M1/Codex/3dbyte-tech-store/tools/node22/node-v22.22.1-darwin-arm64/bin
env -i PATH="$NODE_DIR:/usr/bin:/bin" TMPDIR="$KB/tmp" \
  NEXT_TELEMETRY_DISABLED=1 LOCAL_KNOWLEDGE_WORKSPACE="$KB" \
  LOCAL_COVERAGE_CASES=/Volumes/MINI-M1/Codex/3dbyte-tech-store/worktrees/local-knowledge-chat-20261013/scripts/local-knowledge/evaluation/coverage-followup-all-cases-v1.json \
  LOCAL_COVERAGE_ROUTE_REPORT="$KB/reports/fresh-coverage-streams.json" \
  node node_modules/jest/bin/jest.js --config jest.local-knowledge.config.cjs \
  --runInBand --cacheDirectory="$KB/cache/jest-local-chat"
```

Choose a fresh report filename; earlier evidence is never overwritten. From the repository root, using the cleared Python environment:

```sh
python3 -B scripts/local-knowledge/evaluate_customer_coverage.py \
  --fixture coverage-followup-all-cases-v1.json \
  --route-results /Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013/reports/fresh-coverage-streams.json \
  --report fresh-coverage-verification.json
python3 -B -m unittest discover -s scripts/local-knowledge -p 'test_*.py'
```

For an authorized unchanged replay, the existing local review mechanism accepts the bounded seed filename:

```sh
python3 -B scripts/local-knowledge/activate_coverage_guides.py --report fresh-guide-replay.json
python3 -B scripts/local-knowledge/activate_catalogue_references.py \
  --seed followup-catalogue-seed-v1.json --report fresh-product-replay.json
```

Validation: **50 Python tests, 78 local-chat Jest tests, 22/22 independent source/rendering checks, Ruff F/E9 and source/test TypeScript pass**. The configured ESLint excludes TypeScript. Canonical storefront types still encounter the pre-existing generated React 18/19 peer mismatch; the parent integration owns its scoped fix and release gates. No dependency or production-security changes are included.

Ports **3005 and 8873 remain stopped**. No native approval, staging write, new credential/access, paid/model call, push, merge or deployment occurred.
