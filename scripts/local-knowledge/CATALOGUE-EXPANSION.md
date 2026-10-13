# Six new source-backed catalogue references

On 13 October 2026, six nonduplicate manufacturer-brand identities and six original selection guides were accepted for **local development** through the existing `Store.ingest` agent factual-review mechanism. They are actual local SQLite reference groups, variants and document bindings. They are not Medusa products, selected physical supplier variants, checkout offers, native approvals or a staging import.

| Corpus measure | Before | After |
| --- | ---: | ---: |
| Product identities / reference variants | 23 | 29 |
| Source documents | 41 | 47 |
| Editorial guides | 15 | 21 |
| Active claims | 303 | 383 |
| Supported facts | 112 | 144 |
| Explicit unknown claims | 137 | 179 |
| Editorial inferences | 54 | 60 |
| Immutable registered source versions | 71 | 88 |
| Native approvals | 0 | 0 |

The additions contain **32 supported facts, 42 explicit unknowns and six editorial guide claims**. All 56 prior active records retain their revisions. A later refinement of the new PP price statement retained its byte-verified AUD70.75 observation and moved an uncaptured AUD72.50 research lead outside accepted facts. That refinement creates one additional honest local review event, bringing the total to 125; it does not claim human review.

## New identities and observed Australian references

All amounts below are external retailer observations captured on 13 October 2026, including GST. They are reference prices, not current offers, store prices, physical inventory or delivery promises. DREMC is the retailer for manufacturer-branded products here; its own-brand products are excluded.

| Identity | Official source | Australian reference | Dated AUD | Unresolved scope |
| --- | --- | --- | ---: | --- |
| Micro Swiss FlowTech M3101, K1 family | [Manufacturer](https://store.micro-swiss.com/products/micro-swiss-flowtech-hotend-for-creality-k1-k1-max) | [DREMC](https://store.dremc.com.au/products/micro-swiss-flowtech-hotend-for-creality-k1-k1-max-k1c) | 119.95 | Actual AU adapter/package revision, other nozzle-system fit, default brass nozzle abrasive rating |
| LDO Orbiter v2.5 complete extruder | [Designer](https://www.orbiterprojects.com/orbiter-v2-5/) | [DREMC](https://store.dremc.com.au/products/ldo-orbiter-v2-5-extruder) | 105.45 | Exact calibrated rotation distance, full assembly weight, machine mounting |
| Slice Engineering 1.5 Nm nozzle torque wrench, P-NTW-AC-0015 | [Manufacturer](https://www.sliceengineering.com/products/nozzle-torque-wrench-1-5-nm) | [Phaser FPV](https://phaserfpv.com.au/products/slice-engineering-nozzle-torque-wrench) | 55.95 | AU adapter bundle, universal hotend fit |
| BuildTak PEI sheet, 235 x 235 mm | [Manufacturer](https://buildtak.com/products/buildtak-pei-3d-printing-surface) | [B3D](https://b3d.com.au/DispProd.asp?CatID=8&ProdID=ptTapePEI235&SubCatID=132) | 32.60 | Adhesive cleanup guarantee, whole FlexPlate inclusion, universal flexible-material fit |
| BuildTak Spatula, B3D standard reference | [Manufacturer](https://buildtak.com/products/buildtak-spatula) | [B3D](https://b3d.com.au/DispProd.asp?CatID=8&ProdID=tlSpatulaBT&SubCatID=132) | 39.95 | Exact AU blade length/MPN, scratch-free guarantee |
| Fiberlogy PP Graphite, 1.75 mm, 750 g | [Current material family](https://fiberlogy.com/en/product/pp-filament/) | [Exact retailer variant](https://www.proforged3d.com.au/products/fiberlogy-pp-graphite-1-75mm-750g?country=AU&currency=AUD&variant=50549052932375) | 70.75 | Legacy spool recipe applicability, AMS compatibility, exact manufacturer MPN, food/medical/chemical certification, authoritative live price |

Shipping is calculated separately on the DREMC, Phaser and ProForged pages. B3D shipping charges remain unverified, and both captured B3D pages display a prices/stock update of **2 Oct @ 16:31**. Stock labels, including the Phaser out-of-stock observation, are retained in the immutable captures without becoming active inventory claims. ProForged's earlier indexed price discrepancy remains an unverified research note in the seed; it is not used as positive evidence.

The Orbiter designer's 4.69 baseline and another Australian page's 4.637 are preserved as scoped observations in selection guidance, with the actual calibrated value unknown. The complete assembly and genuine-LDO-v2.0-only upgrade kit remain separate choices. BuildTak's current adhesive-change notice takes precedence over a cleanup guarantee inferred from older retailer wording. Current Fiberlogy family instructions are conditional context, with applicability to the legacy spool explicitly unresolved. The Slice wrench's manufacturer exclusion for nozzles rated below 1.5 Nm is retained.

## Newly answerable customer questions

- Which printers does the official FlowTech M3101 support, and what heater/nozzle does the current manufacturer package list?
- Should I choose a complete Orbiter v2.5 or the separate v2.0 upgrade kit?
- Is the Slice torque wrench suitable for a nozzle rated to 1.0 Nm?
- What material and nominal thickness does the BuildTak PEI surface use?
- What are the BuildTak Spatula blade and handle made from, and which blade-length choices does the manufacturer list?
- What does the current Fiberlogy PP family say about PP tape and drying, while preserving the legacy-spool limitation?

The six guides give original selection guidance around those distinctions. They do not copy marketing claims, certify finished parts or reproduce 3D Sets manual/FAQ content. The existing 3D Sets official-resource path remains link-only.

## Evidence, offline verification and reproduction

The data and immutable raw/text captures remain in the dedicated SSD workspace:
`/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013`.

`evaluation/catalogue-seed-v1.json` contains the reviewed claim definitions, exact excerpts/JSON pointers, query scope and null fields. Its corresponding external `reports/catalogue-captures-v1.json` records 17 actual capture versions. Each positive claim is checked against fresh raw/text SHA-256 and its exact excerpt before ingest and again before retrieval. `evaluation/catalogue-expansion-receipt-v1.json` pins sources, record revisions and results. Local review identifies the Codex agent, marks human factual review pending and native approval false.

No listening service is required for the following checks. From the repository root, set the usual cleared Python environment from `README.md`, then run:

```sh
python3 -B scripts/local-knowledge/evaluate_catalogue_offline.py --report fresh-catalogue-offline.json
python3 -B -m unittest discover -s scripts/local-knowledge -p 'test_*.py'
```

For an authorized replay on this Mac, using the same dedicated workspace and immutable manifest:

```sh
python3 -B scripts/local-knowledge/activate_catalogue_references.py --report fresh-catalogue-replay.json
```

Replay tests confirm no new products, records, claims or editorial events when the seed is unchanged. Source registration, real local variant bindings and source/document review remain within the dedicated SQLite boundary. The initial activation and price refinement have separate full SQLite backups in `exports`; none of the original approved packet files is changed.

From `apps/storefront-v3`, supply the independently checked retrieval report to the opt-in route suite:

```sh
LOCAL_CATALOGUE_ROUTE_FIXTURES=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013/reports/catalogue-offline-final-v2.json \
  node node_modules/jest/bin/jest.js --config jest.local-knowledge.config.cjs \
  --runInBand --cacheDirectory=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013/cache/jest-local-chat
```

The frozen 22 new questions passed **0/22** before activation, **21/22** in the first completed pass, and **22/22** after correcting drying-fact versus general-guide selection. The real chat handler streams the independently checked persisted context in offline tests with mocked loopback transport; it was not tested through a running HTTP service in this pass. Six named-product follow-ups and ambiguous comparisons are also tested; an observed `what about its` scope loss was fixed. These are now deterministic regressions, not an independent LLM quality evaluation.

Validation: **42 Python tests, 70 local-chat Jest tests, Ruff F/E9 and source/test TypeScript passed**. The configured ESLint excludes TypeScript. Canonical storefront types still fail in a pre-existing generated `.next/dev` layout with React 18/19 type-peer incompatibility; the parent integration owns its scoped fix and release gates. No dependency upgrade or gate bypass is included; Medusa remains 2.15.5 and Strapi 5.48.1.

Both preview services on 3005 and 8873 remain stopped. There are no paid calls, new credentials/access, staging writes, push, merge or deployment.
