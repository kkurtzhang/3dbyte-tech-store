# 3D Sets first source-link slice

The development chatbot now routes Sandy, Max 4x4, Rancher Hardtop, Skippy and Triton questions to an explicit model/resource index. Assembly answers provide official public presentation links where their model/revision identity is established. No build-guide content, diagrams, paid model files, FAQ answers or guide embeddings were fetched or added to the corpus. The official FAQ is linked with its 23 June 2021 date; its technical advice is not promoted over current model-specific information.

Source/index metadata lives in `apps/storefront-v3/src/app/api/ai-shopping-assistant/three-d-sets-source-index.json`. Factual confidence, rights/usage policy and native approval are separate fields. These resources are not approved knowledge claims and do not change the 53-record SQLite corpus. No CMS/commerce schema changes or native publication occurred.

## Version and identity boundaries

- Sandy: publisher-linked guide v1.0. Printer-size wording conflicts on the product page remain unresolved; no printer requirement is inferred here.
- Max 4x4: model 15, product release 1.0.4. The publisher's link label says Max Team; delegated research reports the linked title Max 4x4 and guide v1.0. The router preserves this conflict and gives the publisher product page for confirmation. Gearbox options and kit revision applicability remain unknown.
- Rancher Hardtop: product release 1.4.1, latest linked guide v1.4.0. Older explicitly indexed guide revisions can be selected, without equating product and guide versions.
- Skippy and Triton: indexed boat identities. Exact guide/version links are not established in this slice, so the router gives the publisher product page. Jet aircraft coverage remains unverified.
- Unknown or compared models request an exact model/body variant and version. An unindexed guide revision does not silently fall back to another revision.

## Physical kits and retailer evidence

The store sells physical build kits. Actual store SKU, supplier kit revision, included/excluded contents, supported model release, price, stock and digital-access inclusion remain null. Digital model access/licensing is separate from physical hardware. Model requirements, retailer packages and Kurt's store offerings are distinct identities.

The index includes three dated DREMC retailer examples verified from its public variant data on 13 October 2026: WES2487 at AUD224.95, WES2488 at AUD244.95 and WES2489 at AUD249. These are observed third-party offers. Their availability flags are capture-time observations; neither those flags nor prices enter store commerce answers. The listing title names 3DMakerParts while its vendor field says West3D; manufacturer attribution remains unresolved. Exact model-release compatibility, connector type and kit revision remain null.

Supplier kit BOM evidence and component inclusions/exclusions need a separate bounded review. Parent research identified an XT60/Tamiya wording conflict and a missing Sakura small-servo quantity; neither is resolved by inference. Landy model16 marked SOON does not establish compatibility. The non-AU Max Team comparison is excluded from the AUD baseline.

For accurate store mapping, Kurt needs to identify each intended store SKU and exact supplier kit SKU/BOM revision, supported 3D Sets model/release/body and gearbox options, included/excluded electronics/fasteners/printed parts, connector type and whether any digital access is bundled. Current store price/physical inventory must come from the verified commerce system.

## Preview and verification

Use the two-service procedure in `README.md`, then send these questions through the existing route/drawer:

- `How do I assemble model 11 Sandy?` — official presentation link, no copied assembly steps.
- `Model 2 assembly guide v1.3.2` — specifically indexed older Rancher guide.
- `How do I build Max 4x4?` — visible source-label/version ambiguity.
- `3D Sets FAQ please` — official dated FAQ link.
- `Does my Sandy kit include STLs and a radio, and is it in stock?` — store kit contents/access/commerce remain unknown.
- `How do I build a 3D Sets jet aircraft?` — unverified aircraft identity, catalogue link.

The live source-link routing check passed seven cases through the actual project API. Final focused Jest checks passed 35 cases (22 existing adapter/focus cases plus 13 RC cases); the final storefront TypeScript check passed, and all eight source-evidence regressions plus seven citation rejection checks remain passing. The new tests also cover assistant/private history exclusion, compared models, unsupported revisions and retailer/store identity separation. This is deterministic source routing; no LLM quality or browser visual verification is claimed. Staging still needs native review, exact product mapping, parent-coordinated security integration and required release checks.
