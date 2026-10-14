# Bounded evidence reconciliation

This milestone begins at `1a53021a652773403b289a17eec3457d3f76ef12` on `fix/knowledge-evidence-reconciliation-20261013`. It reconciles the nine held source-type facts, four multiple-source claims and 29 original guides. Previous commits, source versions and active SQLite data are preserved. The one full report is `reports/evidence-reconciliation-v1.json` in the SSD workspace; its paths/hashes and validation are pinned in [evaluation/evidence-reconciliation-receipt-v1.json](evaluation/evidence-reconciliation-receipt-v1.json).

## Four combined claims reconciled

| Original claim | Separate prepared facts | Remaining boundary |
| --- | --- | --- |
| BuildTak sheet dimensions | Manufacturer option and retailer dimensions each have their own source proof. | Measure the received surface/bed; matching descriptions do not establish a physical or native binding. |
| BuildTak adhesive revision warning | Manufacturer change notice and captured retailer adhesive wording remain separate attributed statements. | Supplied adhesive revision and cleanup guarantee remain unknown. |
| CM2 M2904-04 identity | Manufacturer 0.4 mm variant SKU and retailer SKU are separate source facts. | Actual package/native variant remains unbound. |
| CM2 insert versus M3101 default nozzle | CM2 M2 insert stays with CM2; the already-prepared M3101 brass-plated default stays with M3101. | The comparison is original selection commentary; ratings and assembly limits do not transfer. |

Eight source-specific atoms cover these claims. Seven are new preparation facts; the eighth is already represented. The previously absent CM2 retailer JSON fragment is prepared from an **already registered** source. The new preparation pool has **65 fragments / 162 positive facts**, versus 64 / 155 previously. The selected 33 primary bindings are preserved. Original combined claims remain in their historical local records; they are not relabelled as single-source manufacturer statements or automatically approved.

The current [BuildTak product page](https://buildtak.com/products/buildtak-pei-3d-printing-surface) corroborates the bounded dimension/change-notice context. [CM2](https://store.micro-swiss.com/products/micro-swiss-cm2-nozzle-for-flowtech-hotend) and [M3101](https://store.micro-swiss.com/products/micro-swiss-flowtech-hotend-for-creality-k1-k1-max) corroborate the separate component descriptions. Exact preparation proofs use the preserved captured bytes rather than unpinned current page text.

## Nine genuine source-form holds

| Existing record / fields | Actual evidence | Exact native hold |
| --- | --- | --- |
| `prior_R12_E08`: part number, model | Creality K2 Plus support parts catalogue | Support catalogue is outside the existing five source forms; no explicit manual/datasheet classification. |
| `prior_R14_E08`: module and pad part numbers | Same manufacturer parts catalogue | Same source-form hold; module and pads stay distinct. |
| `prior_R16_E09`: adapter part, named model, dimensions | Creality K2 Pro support parts catalogue | Same source-form hold; no wider model-fit inference. |
| `prior_R18_E10`: circuit-board part | Manufacturer troubleshooting article | Troubleshooting article is not automatically a sales page or manual. |
| `prior_R12_K2IMAGE6`: component materials | Manufacturer diagram, manually transcribed and visually checked | Standalone diagram/image is outside the plain-text reference source contract. Its product-page origin does not make image labels page text. |

All nine have intact source evidence. The report retains individual fields, raw/text hashes, exact citations, original factual bases and reasons. These are **source-form holds, not declarations that the facts are false**. No `official_manual`, `official_product_page` or `generated_reference` label is applied merely to force eligibility.

The diagram is linked in archived [Creality product-page](https://store.creality.com/products/k2-plus-ceramic-heating-block-kit) bytes and its archived pixels were inspected. Its material labels and resistance headline corroborate existing scoped observations; no operating setpoint/rating is inferred. A matching manufacturer text/manual/datasheet would resolve the image-form prerequisite under the current contract. The public web reader returned only a support shell for the three current wiki pages, so their historical original bodies provide the factual evidence; no current page refresh or browser execution is claimed.

To include these exact nine facts in native reference bodies requires equivalent exact evidence in an allowed source form, or a separately scoped content-model/source-form decision. Neither is necessary for the 33 already-prepared partial reference products. Exact package, electrical, cross-model and physical stock unknowns remain unknown.

## Editorial guidance and citation repairs

All **29 guides / 75 positive statements** contain source-dependent facts combined with original selection or boundary commentary. No entire positive statement is exempted from citations merely because it is editorial. The report retains its factual basis, citations and unknowns, labels it **“Original store selection/navigation guidance with attributed source facts”**, and supplies a separate original navigation sentence without technical specification or compatibility assertions. Guides are not manufacturer-authored manuals or approved native source documents.

Seven targeted citation repairs are prepared:

- G02 board dimensions and cable aliases: add exact missing excerpts from the existing manufacturer table and retailer cable text.
- G03 Weller compatibility: add the captured `WES50/51` wording rather than silently treating a separate absent `WES51` string as proof.
- N15 scratch resistance: add the exact named-sheet notices beside the already-cited metal-tool prohibition.
- Panchroma guide: retain the full conditional drying excerpt, including its moisture condition.
- G04 diameter/SKU mapping: eight exact pairs are verified in archived manufacturer/retailer HTML data. Raw-source offsets are kept distinct from normalized-text offsets; barcode or image-alt fields are not used as variant identity proof. A new linked derived-text representation is required before activating these as current `Store.cite` citations.
- G04 resistance comparison: the diagram observation is explicitly visual, while the captured text claim remains separate; the operating limit stays unknown.

These are **preparation repairs**, not silently changed active guide records. Five text repairs already fit the current citation contract. The selector and diagram repairs retain their distinct representation limits. Existing byte checks prove source/citation integrity; they are not an automatic full semantic-entailment score for every sentence. Derived facts have the honest `codex_local_evidence_reconciliation` preparation identity and remain pending final native review; prior local review events are not misrepresented as approval of newly rewritten statements.

CMS placement is an optional product decision: the existing blog supports drafts but requires a FeaturedImage; guides-page and help-center are navigation singletons without Draft & Publish. Choosing a reviewed editorial destination does not confer native reference approval. No page/content-type schema or CMS content was changed. 3D Sets build guides and FAQs remain official links only; independent supplier tables are not recast as model instructions.

## Completion, genuine blockers and verification

The selected 33 partial reference products have no additional factual prerequisite from these optional gaps. Native progress genuinely awaits the actual target/IDs, a real final canonical-review event, explicit native-action authorization and parent release gates. The nine source-form holds and any richer guide publication are optional evidence/design decisions. Guide citation activation/selector normalization could be scoped as another reversible local task; this milestone preserves the active v1 corpus and delivers its prepared changes honestly.

**68 Python tests**, including six new reconciliation regressions, and **65 actual shared/CMS/backend pure contract checks** pass. The derived preparation bodies retain all unknowns, pending review and null native IDs. Wrong SKU/title pairs, missing evidence, unsupported null promotion, unsupported source kinds, pending approval projections, priced shells and wrong-environment binding are rejected. Ruff F/E9 and formatting checks pass. No TypeScript runtime source changed. The combined integration preserves the scoped React type-peer fix and verifies full canonical types separately from the source milestone.

Reproduce from the repository root using the cleared Python/SSD environment in [IMPORT-READINESS.md](IMPORT-READINESS.md):

```sh
python3 -B scripts/local-knowledge/reconcile_evidence.py --report fresh-reconciliation.json
python3 -B -m unittest discover -s scripts/local-knowledge -p 'test_*.py'
```

The full report contains `prepared_native_plan`, consumable by the existing offline `validate_import_readiness.cjs` function. New report basenames are required. The receipt verifies every SQLite table against the preserved v1 backup and prior artifact hashes. All artifacts/logs/temp stay on the external SSD; ports 3005/8873 remain stopped. No products/claims/source versions were added to the active store, and no new local/native approval, service, credential/access, dependency, model call, staging/shared DB write, push, merge or deployment occurred.

## Combined-store provenance

The saved source manifest remains hash-pinned and unchanged. Reconciliation rebuilds the base preparation from the current isolated store, then requires exact equality of all facts, source proofs, primary selections and native permission fields. Only preparation time, local statistics, existing local-event metadata and source-file locations are excluded from that comparison. Current local event IDs, actors and revisions therefore stay tied to their actual SQLite history. Evidence or permission drift fails closed. The diagram inspection is attributed to the prior source milestone; reproducing this report does not claim a fresh visual inspection.

A new source fragment carries preparation-review entries only for its own source-specific facts. Prototype review entries are not inherited; the eight atoms therefore have exactly seven new preparation entries plus one already-prepared fact. These are evidence-preparation annotations, not SQLite or native approval events.
