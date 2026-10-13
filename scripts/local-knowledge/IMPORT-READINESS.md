# Offline native-import readiness follow-up

This follow-up resolves preparation gaps without adding products or changing the KB. It starts from completed v1 commit `ddfa0a1fbefc2b66d53414265865ca85a65cd4c2` on `fix/knowledge-import-readiness-20261013`. The v1 branch, SQLite snapshot and original 53-fragment manifest are preserved and hash checked.

The original zero native-eligibility count means **unbound identities, pending final native review and unauthorized native actions**, rather than failed factual coverage. All original 53 document bodies already accepted supported facts alongside null unknowns. Native eligibility remains zero honestly; offline preparation now distinguishes those gates.

## Concrete blocker matrix

| Category | Original state | Resolved offline | Remaining native step |
| --- | --- | --- | --- |
| Native IDs | All 53 fragments / 33 shell plans lacked actual product, variant and document IDs. | Group-consistent mappings and one primary document per reference are prepared. Fixture IDs are explicitly local and never copied into native templates. | Read or create actual native identities after authorization; confirm unique matches and read back handle/title. |
| Factual and native review | Existing local source acceptance was mixed with final native-review prerequisites. | Current real local review event IDs, actors, revisions and original factual basis are retained for all candidates. Source bytes/excerpts are reverified under the Codex preparation identity. | Record a genuine authorized review of the final native canonical revision, with honest reviewer identity. Local acceptance and past user-chat factual approval do not fabricate this event. |
| Unsupported / unknown facts | 37 source-kind omissions, four multiple-source claims and editorial guides were held. Nulls already passed. | 28 already-supported facts recovered through 11 additional source fragments. Unknowns stay null. | Nine support-page/image source-type gaps, four multiple-source claims and 73 editorial claims remain separately held. Two unbound N02 guide facts are accounted for; equivalent PA6 TDS facts are prepared. These do not block supported partial references. |
| Schema and binding | The generic body template was not a Strapi draft payload. Each fragment used unrelated fixture product IDs. The reference card binds one document per product. | Native Strapi record/core-intake/private-field shapes, required fields, string source version versus numeric content version, and 33 single-primary binding plans are prepared. | Use actual IDs before writes/hash computation. Additional fragments are alternatives; exposing every source in one card would require a separately scoped design change. No schema exception is needed for the selected partial references. |
| Environment | No native services or authenticated target were exercised here. | Existing shared parser, Strapi schema/CMS canonical hashing and Medusa guards are checked offline. | Verify the authorized staging target, current deployed gates, existing Admin capability and actual readbacks. No startup, credential/access expansion or shared database action occurred. |
| Action authorization | Creation, native review writes, publication and metadata binding were outside this task. | Concrete private templates and proposed scope are available for review; every apply flag remains false. | Obtain specific authorization for the selected staging operations. Parent-owned security/release/index activation remains separate. |

## Preparation changes and evidence

The new SSD manifest `reports/import-readiness-plan-final-v1.json` contains **64 source fragments with 155 supported facts**, versus 53 fragments / 127 facts in the preserved v1 manifest. **33 primary documents** contain 103 supported facts; **31 alternative fragments** remain optional private supporting material. The pool contains 344 nullable fact occurrences because record unknowns repeat across sources; these are not 344 newly created KB claims.

The recovered sources are BuildTak PEI/spatula, Fiberlogy PP, Magigoo PP/Supergrip, Orbiter v2.5, three Creality manufacturer product pages and the exact PolyFlex TPU95-HF datasheet. Classification uses bounded reviewed URLs. The Shopify CDN datasheet additionally requires its exact link in hash-verified archived Polymaker product-page bytes; an arbitrary CDN PDF is not promoted to official evidence. The Polymaker domain matcher now rejects lookalike suffixes.

No unsupported claim is promoted, no multi-source value is relabelled as single-source, and no support article/image or supplier BOM is relabelled as a manual. 3D Sets build guides and FAQs remain official links only. Manufacturer/source classification does not establish a physical supplier batch or universal compatibility.

The real local review evidence comprises **46 current record-level events** shared by the fragments. It is not a new human approval request or a native reviewer event. The preparation actor is `codex_local_import_readiness`; original factual-review bases are preserved. A native final review may use an authorized agent with its honest identity through the supported workflow; no user identity, native status, timestamp or approval is invented here.

All existing corpus counts remain unchanged: **33 references, 80 records, 29 guides, 469 active claims, 110 source versions and 139 local review events**. No native approval or product/variant/document ID is created.

## Shortest legitimate native path

1. Authorize the selected reference-only scope and staging target. Preflight actual Medusa identities/handles and Strapi source-URL/document identities. Reuse only a unique eligible draft; reconcile ambiguous or already-reviewed/bound records explicitly with a backup. Do not overwrite approved content or old packets.
2. Through Medusa Admin or its existing `createProductsWorkflow`, create any missing **draft, one-variant, unpriced reference shells**. The generated templates set `catalogue_role=knowledge_reference`, disable inventory management/backorders and add no real stock or simulation binding. Read back actual product/variant IDs, handle and title.
3. Create/reuse private Strapi core document drafts through the agreed Admin/API path. `StrapiModuleService.upsertAiProductDocumentDrafts` already performs protected exact lookup across draft/published states and uses `?status=draft`; its typed `AiProductDocumentDraftData` defines core fields only. The plan supplies that exact core shape, including `search_keywords=[]` and explicit `is_public=false` to override the schema's public default. Public `find` cannot inspect private drafts.
4. After real native readback, use the supported Strapi Admin path for `version`, `knowledge_content` and pending `knowledge_review`. Bind the actual document/product/variant/handle/title, then compute `knowledgeRevision` with the existing CMS utility. Local record hashes and fixture hashes cannot substitute for that native canonical revision.
5. Perform a genuine authorized review event for the exact canonical document/product/variant/revision under the actual reviewer identity. Save the native review through the supported Admin path and publish only when authorized. The review time must follow source checking; validity must fit the existing 90-day window. The repository has no separate reviewer-action endpoint; normal document publication or durable local-review sync does not grant approval.
6. Call the protected **read-only** Medusa `knowledge-reference-preview` for the approved published DTO and canonical hash. Apply its proposed metadata only through an authorized Admin/workflow update preserving prior metadata. Add the group-bound nonphysical simulation marker using actual IDs, quantity one and `real_stock=false`. Keep draft status, empty prices and disabled checkout.
7. Verify the current CMS approved DTO, Medusa reference card and checkout rejection. The parent separately handles current release gates and explicitly scoped reference-index activation. The remaining alternatives are private and do not overwrite the primary binding.

Physical possession, live sale prices, resolving every kit BOM/connector or filling every null is unnecessary for this partial reference scope. The unavoidable user decision is authorization of concrete native operations on the selected staging scope. An identity choice is needed only if actual preflight finds ambiguity; no such ambiguity is guessed here.

## Reproduce offline and validation limits

From the repository root, choose a new report basename:

```sh
KB=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013
NODE_DIR=/Volumes/MINI-M1/Codex/3dbyte-tech-store/tools/node22/node-v22.22.1-darwin-arm64/bin
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin PYTHONDONTWRITEBYTECODE=1 \
  PYTHONNOUSERSITE=1 TMPDIR="$KB/tmp" LOCAL_KNOWLEDGE_WORKSPACE="$KB" \
  OPENBLAS_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 \
  python3 -B scripts/local-knowledge/prepare_import_readiness.py \
  --report fresh-import-readiness.json
"$NODE_DIR/node" scripts/local-knowledge/validate_import_readiness.cjs \
  "$KB/reports/fresh-import-readiness.json"
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin PYTHONDONTWRITEBYTECODE=1 \
  PYTHONNOUSERSITE=1 TMPDIR="$KB/tmp" LOCAL_KNOWLEDGE_WORKSPACE="$KB" \
  OPENBLAS_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 \
  python3 -B -m unittest discover -s scripts/local-knowledge -p 'test_*.py'
```

**62 Python tests** pass, including six new source-classification, provenance, version/schema, nullable-fact, replay/preservation and primary-binding regressions. **64 actual shared/CMS/backend pure structure checks** pass, including required Strapi fields and canonical hash mapping. Unbound templates, pending private/public approval projections, unsupported null promotions, unapproved cards, priced shells and wrong-environment binding are rejected. Ruff F/E9 and focused JavaScript lint/syntax checks pass. No native approval fixtures are manufactured.

Source/test TypeScript passes. Canonical storefront types still fail on the pre-existing generated `.next/dev` React 18/19 peer mismatch; that parent-owned release limitation is separate. No CMS/backend runtime files or schemas changed, and no native service/API/browser behavior was exercised. The v1 30/30 route gate remains the preceding content milestone.

The compact [evaluation/import-readiness-receipt-v1.json](evaluation/import-readiness-receipt-v1.json) pins the manifest, contract report, frozen artifacts and data-preservation checks. All data, reports and temporary files remain on the external SSD. Ports 3005/8873 remain stopped. No products or claims were added, and no staging/shared DB write, dependency, credential/access, paid/model call, push, merge or deployment occurred.
