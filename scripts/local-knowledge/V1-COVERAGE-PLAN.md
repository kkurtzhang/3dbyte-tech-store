# Finite v1 knowledge coverage

The reference-only v1 content gate is complete: **30/30 frozen customer cases pass**. This bounded milestone starts at `2f2c30cd8a21614dcd8e76597a959e9ad6852a90` on `feat/knowledge-v1-coverage-20261013`. Stop adding products for this first release; further expansion needs a new scope. Native import and delivery each have separate gates.

## Completion criterion and measured coverage

The fixed checklist is [evaluation/v1-coverage-checklist-v1.json](evaluation/v1-coverage-checklist-v1.json): six categories with five cases each. It contains **20 source-grounded answers, nine deliberate unknowns and one official link-only answer**. A case passes only when the actual offline chat handler and persisted retrieval agree on status, scope, current claim identity/revision, exact source bytes/excerpts and rendered source links. Unknowns must retain their null fields and render no positive claim. Official 3D Sets build guides/FAQs remain links only.

| Category | Representative scope | Before | Final |
| --- | --- | ---: | ---: |
| Filament choice | ASA outdoor/enclosure context; exact PLA/PETG grade ranges; certification unknown | 3/5 | 5/5 |
| Drying and storage | PA6 drying/storage; S4 limit; conditional PLA cycle; conflicting PETG cycle | 2/5 | 5/5 |
| Bed adhesion | PETG release layer; cold adhesive application; named sheet chemistry | 3/5 | 5/5 |
| Nozzles and hotends | K1 connector revision; Revo/V6 distinction; minimum diameter; component rating | 5/5 | 5/5 |
| Maintenance and troubleshooting | Stringing and extrusion checks; scoped PLA heat creep; symptom diagnosis unknown | 4/5 | 5/5 |
| Physical kit guidance | Retailer exclusions; independent supplier-family hardware; exact kit scope; official guide link | 5/5 | 5/5 |
| **Total** | | **22/30** | **30/30** |

This is a deterministic regression and content-coverage measure. It does not evaluate generation-model quality, visual browser behavior or live commerce. No preview listener or language model is involved.

## Bounded additions

Two product references, their two original selection guides and one original sheet-care guide close the essential gaps. Existing PA6/storage and adhesive facts gained scoped retrieval routes. A conjunction fix lets “Does stringing prove that my filament is wet?” reach its persisted unknown without treating “that” as an unresolved follow-up.

| Exact reference | Official and Australian evidence | Dated external AUD | Retained conflict |
| --- | --- | ---: | --- |
| Panchroma Basic PLA Black, spool, 1 kg; official CA19006, retailer SKU 34463 | [Polymaker](https://shop.polymaker.com/products/panchroma-pla), [Phaser exact Black variant](https://phaserfpv.com.au/products/polymaker-panchroma-basic-pla-175mm-filament-1kg?variant=46115303424171) | 22.95 | Official sections give bed ranges 25–60°C and 20–60°C; canonical bed range stays null. |
| Polymaker PETG New Formula Black, 1 kg; official PB05001, retailer SKU 34122 | [Polymaker](https://shop.polymaker.com/products/petg), [Phaser](https://phaserfpv.com.au/products/polymaker-petg-high-speed-175mm-filament-1kg) | 27.95 | Official sections give drying cycles 60°C/6 h and 65°C/4 h; canonical temperature and duration stay null. |

Prices were captured on **13 October 2026**, including GST with shipping separate. Panchroma's listing-wide AUD21.95 minimum is not the exact Black observation. These observations never populate native price, stock or checkout fields. Formula/batch, actual spool/dryer, unrelated grade and exact physical supplier bindings remain unverified.

**N15** synthesizes short article-body facts from Prusa's [satin](https://help.prusa3d.com/article/satin-steel-sheet_196526), [textured](https://help.prusa3d.com/article/textured-steel-sheet_196534) and [smooth](https://help.prusa3d.com/article/smooth-steel-sheet_196550) sheet pages. It preserves the acetone prohibition on satin/textured sheets, the smooth-sheet exception, cold alcohol cleaning and tool/surface limits. Comments, full guides/FAQs, assembly instructions and diagrams are not indexed as KB claims; other brands/coatings remain unknown.

| Corpus measure | Before | Final |
| --- | ---: | ---: |
| Local reference identities / variants | 31 | 33 |
| Active records | 75 | 80 |
| Source documents | 49 | 51 |
| Original editorial guides | 26 | 29 |
| Active claims | 428 | 469 |
| Supported facts | 156 | 170 |
| Explicit unknowns | 204 | 226 |
| Editorial inferences | 68 | 73 |
| Registered source versions | 98 | 110 |
| Native approvals | 0 | 0 |

The increment is **41 claims: 14 supported facts, 22 unknowns and five editorial claims**. All 75 previous records retain their exact revisions/payloads; prior product, source, claim-history and review rows are preserved. Unchanged replay creates no new identities or review events. Local source review uses real `Store.ingest` events by the Codex agent. Human factual review is pending; native approval is never implied.

## Staged-import preparation readiness

The SSD report `reports/v1-staged-import-preparation-manifest-v1.json` inventories all **80 records**, proposes **53 single-source candidate fragments** and includes **33 reference-shell plans**. Its exact path/hash and record/source hashes are in [evaluation/v1-coverage-receipt-v1.json](evaluation/v1-coverage-receipt-v1.json).

The existing shared native parser accepts all 53 explicitly named local structure fixtures. It rejects every unbound template and every unreviewed document. Templates have null native product/variant/document/handle/revision/review fields, private publication state and apply disabled. URL-based source-kind classifications are proposals for review. Editorial synthesis, multiple-source comparisons, unsupported source classifications and excessive native field widths are held explicitly; no `generated_reference` exception is used.

**Native import eligible: zero.** Remaining work requires exact native bindings, curation of held fields, genuine factual review of final canonical revisions and explicit authorization for native writes/publication. Reference-only products do not require physical possession. Planned shells are draft, have one variant, null stock/card price, empty prices and disabled checkout; simulation quantity is one with `real_stock=false`.

Braces/security/deployment readiness belongs to the parent integration and is reported separately. Passing this content gate does not bypass those checks or authorize staging writes.

## Verification and evidence

- **56 Python tests** and **82 local-chat Jest tests across eight suites** pass, including exact-grade conflicts, dated price/variant scope, byte drift, unchanged replay, follow-up resolution and preparation-policy boundaries.
- **30/30** final route/source/rendering checks pass. Immutable captures verify raw/text SHA-256, excerpt offsets or JSON pointers.
- At the source milestone, Ruff F/E9 and source/test TypeScript passed, while canonical storefront type checking was blocked by the generated `.next/dev` layout React 18/19 peer mismatch. The combined integration retains the scoped React type-peer fix and verifies canonical types with both generated production and development declarations included.
- Existing ESLint exits zero but ignores all three changed TypeScript files because its configuration covers JavaScript only. TypeScript lint coverage is not claimed.
- Ports **3005 and 8873 have no listeners**. No service restart, native approval, staging write, dependency/access change, paid/model call, push, merge or deployment occurred.

All reports, captures, SQLite snapshots, caches and temporary files remain under `/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013`. The final database backup is `exports/v1-final-local-snapshot-v1.sqlite3`. Five historical lost raw captures remain unavailable and are not reconstructed or used by new positive claims.

The original product activation succeeded before receipt generation encountered a `KeyError` for failed capture entries. The reporting helper now separates failed attempts; the receipt was recovered from actual persisted state and the pre-activation backup without rollback or reimport. Two initial 3 MB capture rejections are preserved; bounded 5 MB captures supplied the official pages. This recovery and unchanged replay are documented in the compact receipt.

## Reproduce offline

From `apps/storefront-v3`, use a fresh stream-report basename:

```sh
KB=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013
NODE_DIR=/Volumes/MINI-M1/Codex/3dbyte-tech-store/tools/node22/node-v22.22.1-darwin-arm64/bin
env -i PATH="$NODE_DIR:/usr/bin:/bin" TMPDIR="$KB/tmp" \
  NEXT_TELEMETRY_DISABLED=1 LOCAL_KNOWLEDGE_WORKSPACE="$KB" \
  LOCAL_COVERAGE_CASES=/Volumes/MINI-M1/Codex/3dbyte-tech-store/worktrees/local-knowledge-chat-20261013/scripts/local-knowledge/evaluation/v1-coverage-checklist-v1.json \
  LOCAL_COVERAGE_ROUTE_REPORT="$KB/reports/fresh-v1-streams.json" \
  LOCAL_CATALOGUE_ROUTE_FIXTURES="$KB/reports/catalogue-offline-final-v2.json" \
  node node_modules/jest/bin/jest.js --config jest.local-knowledge.config.cjs \
  --runInBand --cacheDirectory="$KB/cache/jest-local-chat"
```

From the repository root, grade the stream and run Python regression checks using the cleared SSD environment:

```sh
KB=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013
NODE_DIR=/Volumes/MINI-M1/Codex/3dbyte-tech-store/tools/node22/node-v22.22.1-darwin-arm64/bin
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin PYTHONDONTWRITEBYTECODE=1 \
  PYTHONNOUSERSITE=1 TMPDIR="$KB/tmp" LOCAL_KNOWLEDGE_WORKSPACE="$KB" \
  OPENBLAS_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 \
  python3 -B scripts/local-knowledge/evaluate_customer_coverage.py \
  --fixture v1-coverage-checklist-v1.json \
  --route-results "$KB/reports/fresh-v1-streams.json" --report fresh-v1-verification.json
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin PYTHONDONTWRITEBYTECODE=1 \
  PYTHONNOUSERSITE=1 TMPDIR="$KB/tmp" LOCAL_KNOWLEDGE_WORKSPACE="$KB" \
  OPENBLAS_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 \
  python3 -B -m unittest discover -s scripts/local-knowledge -p 'test_*.py'
"$NODE_DIR/node" scripts/local-knowledge/validate_v1_import_manifest.cjs \
  "$KB/reports/v1-staged-import-preparation-manifest-v1.json"
```

`prepare_v1_import_manifest.py --report fresh-v1-manifest.json` builds another read-only inventory using the same cleared Python environment. Report generators require a new filename and preserve prior evidence. No preview service is needed.
