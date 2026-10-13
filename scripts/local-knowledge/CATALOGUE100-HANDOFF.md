# 100-product local knowledge corpus

The authorized expansion is complete: **100 source-backed local product/family knowledge references** in the separate SSD corpus, with **103 stored references** including three unresolved legacy kit identities that are excluded from the count. The original v1 corpus remains unchanged. The machine-readable [receipt](evaluation/catalogue100-receipt-v1.json) records the source milestone’s hashes, tests and provenance. Integration verification is documented below; this count does not establish 100 live SKUs or complete conversational coverage.

Work branch: `feat/knowledge-100-products-20261013`, based on `588279c3ac2d067b06c8e11b365dd0d6d7cfaa21`. The latest instruction was “keep building knowledge base until we have 100 products,” delegated through source thread `01a11a2a-4478-70c8-863c-bd4818f820e5` on 13 October 2026.

## Counting and evidence

| Identity group | Counted references |
| --- | ---: |
| Existing source-backed references | 30 |
| New filament formulations/grades | 21 |
| New hardware models/components | 25 |
| New accessories/tools | 24 |
| **Counted total** | **100** |

Of 72 researched candidates, 70 were imported and two remain held: the captured Fiberlogy PA12 page did not provide substantive manufacturer technical details, and the 3DLAC Plus official endpoint returned an empty body. The three existing WES2487/WES2488/WES2489 physical kit references remain intact but uncounted because retailer metadata says West3D while the listing title says 3DMakerParts; original-brand/package attribution is unresolved. No replacement candidates are needed to meet the goal.

Colours, diameters, spool masses, package quantities and cosmetic options do not create additional identities. Material formulations, hardness grades, functional hardware models, mounting interfaces and separate components do. No new retailer own-brand identities are counted. The three unresolved legacy kit records remain stored but excluded. Every new record has at least two supported manufacturer facts and an actual local agent review; there is no claim of user factual approval or native approval.

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

## Historical source verification

These results describe source commit `1132c55ef07ac376216c18ed7123c680f3585d09`; the fresh integrated results follow below.

- **19 expansion Python tests pass**, including all 70 product routes, 140 live-price/stock negatives, 70 dated-price queries, exact citations, canonical deduplication, preserved history and adjacent-model scope.
- **81 original v1 Python tests pass**. All **15 original SQLite tables** still match the final v1 snapshot exactly; all 80 original records, product identities, source metadata and prior reviews are retained in the expanded corpus.
- **78 actual offline route cases pass**: 70 named-product positive cases, four wrong-model unknowns and four live-price unknowns. The actual handler uses persisted Python retrieval via a subprocess, with no socket or model call. The first 35-case run reached the existing 30/minute request limit; bounded reruns passed without changing that limit. The other 59 existing Jest cases passed; one optional fixture case was skipped.
- Storefront **source/test TypeScript passes** under the established configuration excluding `.next/dev`. At the source milestone, the generated React 18/19 limitation was still open. The integration retains the parent’s scoped React type fix and passes the full workspace type command, including generated development types; see below.
- Ruff F/E9, Python syntax checks and formatting pass. No listeners were present on 3005 or 8873.

A bounded check against the integration’s private fixture:

```sh
KB100=/Volumes/MINI-M1/Codex/3dbyte-tech-store/tmp/security-knowledge-integration-20261013/catalogue100-fixture/catalogue100
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin \
  PYTHONDONTWRITEBYTECODE=1 PYTHONNOUSERSITE=1 \
  TMPDIR="$KB100/tmp" LOCAL_KNOWLEDGE_WORKSPACE="$KB100" \
  OPENBLAS_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 \
  /opt/homebrew/bin/python3 -B -m unittest discover \
  -s scripts/local-knowledge -p 'test_catalogue100*.py'
```

This batch validates direct named queries for the new records. It does not expand the frontend's existing multi-turn subject registry or imply that every new pronoun-only follow-up is supported. Native store binding, private CMS drafts, publication, indexing and release checks remain separate authorized work. No services, preview, dependencies, paid model calls, credential changes, native writes, push, merge or deployment occurred.


## Independent integration verification

The follow-up branch `integration/security-knowledge-catalogue100-20261013` starts from `48febf228230b3a090882fa8617f0309cd7f6494` and incorporates source commit `1132c55ef07ac376216c18ed7123c680f3585d09`. Verification used a private SSD fixture copied from the hash-pinned frozen expansion export. Neither active shared knowledge database was opened. Archived source bytes were copied unchanged; only private raw/text file paths were relocated.

The independent SQL, ledger, revision, review-event and citation checks confirm 103 stored product/variant references and **100 counted identities: 30 baseline plus 70 additions**. All 70 additions have two archived manufacturer facts, distinctness rationale and an actual recorded local agent review. The 247 retained source review events comprise 168 source-baseline events plus 79 expansion events, including nine metadata revisions whose supported facts are unchanged. They are historical events, not new integration reviews or user/native approvals. The earlier integrated v1 fixture separately retains its 165 actual events without fabrication or replacement.

Counting uses canonical keys, official-page scope and manual material-grade/component review; it is not universal entity resolution. Functional distinctions include PA12 CF15 versus GF15, TPU hardness/formulation grades, CHT mounting interfaces and metal constructions, complete extruders versus spare motors/gears, mainboards versus expansion boards, and the X4/X4L dryer functions. Colours, bores, diameters and package masses do not multiply the count. Some baseline Creality references remain supplier-scoped; their received revisions, fit and contradictory model details remain unknown.

Integration corrects a batch-discovery bug that treated the receipt JSON as product seed data. The corpus preservation test now reads a hash-pinned frozen v1 export with SQLite read-only/immutable access. Four independently reproduced held/adjacent-model fallbacks now return an explicit unknown with no borrowed facts: unfilled Fiberlogy PA12, 3DLAC Plus, Eddy USB and Revo Prusa Mini. Accepted reinforced PA12 grades, Eddy Duo and Revo Six retain their own routes. No records, product counts, source bytes or historical reviews changed.

Fresh checks:

- 22 expansion Python tests pass, covering all 70 named references, 140 live-commerce negatives, 70 dated-price queries, nine cosmetic aliases, held/adjacent identities and citation/review preservation.
- Baseline discovery runs 115 tests: **101 pass and 14 expansion-only tests skip** on the preserved private v1 fixture. All 15 tables still match its frozen baseline.
- 82 actual offline chat-route cases pass in three bounded batches. The existing rate limiter is unchanged; no service or model is launched.
- Full types pass in all five workspaces, including backend admin, generated storefront production/development route types and the three React peer regressions. Dependencies, manifests, lockfile and security checks are unchanged.
- Ruff F/E9 and scoped formatting pass. All 613 active citations, 231 text captures and 226 available raw captures verify. Five historical raw captures remain unavailable and unused by active citations.
- All 15 expansion SQLite tables match the copied frozen export, with only source paths relocated. The 22 source artifact pins and 35 previous handoff artifacts remain unchanged. No native approvals were created.

The frontend multi-turn registry still needs a separate follow-up before broad conversational coverage can be claimed. A direct resolver probe of all 70 additions found 69 pronoun follow-ups asking for clarification and one reducing Fiberlogy ASA to generic ASA. With an older recognized Magigoo PP turn preceding a new name, 69 follow-ups incorrectly selected the older Magigoo subject; the ASA case stayed generic. For example, “Tell me about Magigoo PP,” “Tell me about E3D Roto motor,” then “What about its specifications?” selected Magigoo PP. The validated coverage is direct named questions. New-subject recognition, interruption of stale focus, model/grade distinctions and comparison clarification need bounded regressions in that follow-up. Preview remains off.

Machine-readable evidence, route streams, the isolated snapshot, exact-head patches and readiness report are in `/Volumes/MINI-M1/Codex/3dbyte-tech-store/artifacts/security-knowledge-integration-20261013/catalogue100`. The previous 66-fragment/164-fact native preparation applies to the earlier 33-reference v1 corpus only; this milestone does not prepare or authorize 100 native store records. Native binding, factual approval and release checks remain pending. Braces and the previously documented audit limitations remain unresolved; no audit was retried and no dependency-removal claim is added here.
