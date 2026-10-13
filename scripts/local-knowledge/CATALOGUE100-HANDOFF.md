# 100-product local knowledge corpus

The authorized expansion is complete: **100 verified distinct canonical product identities** in the separate SSD corpus, with **103 stored references** including three unresolved legacy kit identities that are excluded from the count. The original v1 corpus remains unchanged. The machine-readable [receipt](evaluation/catalogue100-receipt-v1.json) records exact hashes, tests and provenance.

Work branch: `feat/knowledge-100-products-20261013`, based on `588279c3ac2d067b06c8e11b365dd0d6d7cfaa21`. The latest instruction was “keep building knowledge base until we have 100 products,” delegated through source thread `01a11a2a-4478-70c8-863c-bd4818f820e5` on 13 October 2026.

## Counting and evidence

| Identity group | Verified products |
| --- | ---: |
| Existing manufacturer references | 30 |
| New filament formulations/grades | 21 |
| New hardware models/components | 25 |
| New accessories/tools | 24 |
| **Verified total** | **100** |

Of 72 researched candidates, 70 were imported and two remain held: the captured Fiberlogy PA12 page did not provide substantive manufacturer technical details, and the 3DLAC Plus official endpoint returned an empty body. The three existing WES2487/WES2488/WES2489 physical kit references remain intact but uncounted because original-brand/package attribution is unresolved. No replacement candidates are needed to meet the goal.

Colours, diameters, spool masses, package quantities and cosmetic options do not create additional identities. Material formulations, hardness grades, functional hardware models, mounting interfaces and separate components do. Retailer own-brands are excluded. Every new record has at least two supported manufacturer facts and an actual local agent review; there is no claim of user factual approval or native approval.

The additions contain **196 supported claims**, **114 verified source versions** and **56 dated AUD price observations**. Fourteen additions lack a verified matching AUD observation. Those prices stay unknown. Manufacturer facts remain separate from retailer package and price observations; all live 3D Byte prices, physical stock, delivery and checkout eligibility remain unknown or disabled.

Changed selectors were checked against the captured bytes. Examples include SFS V2.1 versus the V2.0 manufacturer reference, EBB42 versus EBB36, Prusa Mini versus Revo Six coldside, and X4L versus X4. Their prices were not transferred to the wrong model. Exact alternative revisions, source conflicts and legacy-spool applicability remain explicit unknowns. Nine metadata revisions correct five naming/routing issues and four demonstrated adjacent-model confusions without changing supported source facts; their preceding versions and local reviews are retained.

## Saved corpus

Use this root explicitly; the older v1 default has not been switched:

`/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013-catalogue100`

- [Inventory CSV](/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013-catalogue100/exports/catalogue100-inventory-v1.csv): all 103 stored references, counted/held status, claim counts and dated prices.
- [Canonical ledger](/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013-catalogue100/exports/catalogue100-canonical-ledger-v1.json): accepted identities, distinctness rationale, original candidates and held items.
- [Immutable SQLite snapshot](/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013-catalogue100/exports/catalogue100-final-local-snapshot-v1.sqlite3), SHA-256 `cbea3dda56d181d4706900bd26c893e520057dfccbc8f76911c6813b223bdf22`.
- Active database: `data/knowledge.sqlite3`; archived raw/text sources: `sources/immutable`; batch receipts and route evidence: `reports`.

The final corpus has 150 active records: 121 source documents and 29 existing editorial guides. Its 962 active claims comprise 366 supported claims, 523 unknowns and 73 editorial inferences. There are 247 actual local review events, including preserved history, and zero native approvals. Of 231 registered source versions, five historical unavailable captures remain explicitly unusable and are not cited by active claims. Every active positive citation verifies its archived bytes and exact excerpt.

Inherited sources deliberately retain paths under the original v1 root. Preserve both SSD directories together. Do not replay v1 source-registration scripts against the expansion root: their captures belong to the v1 boundary. The expansion importer rejects already-registered canonical identities instead of creating duplicate records or review events.

## Verification

- **19 expansion Python tests pass**, including all 70 product routes, 140 live-price/stock negatives, 70 dated-price queries, exact citations, canonical deduplication, preserved history and adjacent-model scope.
- **81 original v1 Python tests pass**. All **15 original SQLite tables** still match the final v1 snapshot exactly; all 80 original records, product identities, source metadata and prior reviews are retained in the expanded corpus.
- **78 actual offline route cases pass**: 70 named-product positive cases, four wrong-model unknowns and four live-price unknowns. The actual handler uses persisted Python retrieval via a subprocess, with no socket or model call. The first 35-case run reached the existing 30/minute request limit; bounded reruns passed without changing that limit. The other 59 existing Jest cases passed; one optional fixture case was skipped.
- Storefront **source/test TypeScript passes** under the established configuration excluding `.next/dev`. The pre-existing generated React 18/19 type limitation remains a separate parent-owned release gate; no full generated-type pass is claimed.
- Ruff F/E9, Python syntax checks and formatting pass. No listeners were present on 3005 or 8873.

A bounded local check from the checkout:

```sh
KB100=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013-catalogue100
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin \
  PYTHONDONTWRITEBYTECODE=1 PYTHONNOUSERSITE=1 \
  TMPDIR="$KB100/tmp" LOCAL_KNOWLEDGE_WORKSPACE="$KB100" \
  OPENBLAS_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 \
  /opt/homebrew/bin/python3 -B -m unittest discover \
  -s scripts/local-knowledge -p 'test_catalogue100*.py'
```

This batch validates direct named queries for the new records. It does not expand the frontend's existing multi-turn subject registry or imply that every new pronoun-only follow-up is supported. Native store binding, private CMS drafts, publication, indexing and release checks remain separate authorized work. No services, preview, dependencies, paid model calls, credential changes, native writes, push, merge or deployment occurred.
