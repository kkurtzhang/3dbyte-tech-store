# Partial retailer references: offline mapping and import contract

The evidence supports **three useful partial reference records** for DREMC source variants WES2487, WES2488 and WES2489. Each record truthfully identifies the captured retailer SKU/variant/title/vendor metadata and the shared listing exclusions. These are external retailer references, not claims about Kurt's current kits or their complete contents. Unresolved manufacturer, exact contents/exclusions, model release, kit/BOM revision, connector and small-servo facts remain null.

The scoped documents have **21 supported identity/listing facts and 33 explicit unknowns**. Those unknowns do not prevent the supported fields from passing the existing document-body contract. No source-kind exception, new CMS schema or fabricated reviewer approval is needed to prepare these retailer identity documents. The supplier BOM tables remain separate family-scoped local evidence; they are not implicitly attached as an exact SKU/revision contents guarantee or relabelled as an approved model manual.

## Reference-only versus commercial requirements

| Requirement | Reference-only staging simulation | Actual commercial kit fulfilment |
| --- | --- | --- |
| Physical possession and real inventory | Not required; real stock stays null, simulation marker explicitly `real_stock:false`. | Verified commerce and fulfilment state required. |
| Native identities | Exact selected native draft product/variant/document binding required before native use; currently null. | Actual saleable store product/variant/SKU required. |
| Claimed kit identity | The captured DREMC SKU/variant is exact and evidenced. It is labelled as a retailer reference. | Exact supplier package, kit revision and actual store offering must be verified. |
| Kit contents and compatibility | Unknowns can stay null; no unsupported contents/version/fit claim. | Confirm included/excluded components, model release/body/gearbox, connector and optional-servo quantity. |
| Price and checkout | Native reference prices must be empty; card price null; draft shell, one variant, checkout disabled. Observed retailer offers stay separate. | Verified price, stock, shipping and digital-access/licence scope are required for the offered kit. |
| Approval | Genuine scoped factual review, then native review/publication matching final canonical IDs/revision. None created here. | Additional commercial/product review through the existing owning systems. |

The old reference offer-price examples are not instructions to price a knowledge-reference shell. Current backend `eligibleShell` and `referenceCard` reject priced shells and require the reference role and simulation marker. `smart-import.ts` creates published shopping products with prices/backorder settings; it is unsuitable for this reference-only task and was not executed. The established approved-preparation convention uses unbound templates, exact source evidence, private drafts, genuine review and separately authorized native operations.

## Mapping and dry-run artifacts

- `evaluation/retailer-reference-mapping-plan.json`: three unbound private document templates, exact source sidecars, reference policies, commercial-only requirements and rollback plans.
- `prepare_kit_reference_plan.py`: deterministic offline preparation from the existing source-pinned review; corrupt source data or promoted unknowns fail before preparation.
- `validate_kit_native_contract.cjs`: actual shared parser, CMS revision/approval functions and backend reference contract loaded as pure functions with a restricted require list. All local fixture IDs begin `local_dev_fixture_`; they are never native target IDs.
- `run_kit_reference_dry_run.py`: actual repository local review coordinator using a new isolated SSD SQLite database and immutable captures. It does not call Medusa/Strapi APIs, the operator's staging job, a network source or a model.
- `evaluation/retailer-reference-contract-receipt.json`: structural and reversible-import evidence.

Unbound native templates are rejected by the native canonical-body function. Local fixture identities make their bodies structurally valid, but both private and controlled public-reader projections with pending review are rejected by the actual CMS approval gate. Unapproved reference cards are rejected. Resolving a null connector without evidence, using unsupported `supplier_BOM` kind, or dropping the variant binding fails validation. No approved DTO, reviewer event, publication receipt or native staging identity was invented.

The local coordinator prepared three documents, replayed idempotently, preserved state through close/reopen, rejected duplicate scope and source-hash drift atomically, withdrew only the fixture scope while preserving an unrelated canary and immutable history, then restored the scope. All chunks remain unapproved and ineligible for native/customer retrieval. Synthetic publication flags exist only in the controlled local public-reader projection; the native templates remain private. The active knowledge corpus and handed-off runtime files are unchanged.

## Reproduce and reverse locally

Use existing dependencies, from the repository root:

```sh
KB=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin \
  PYTHONDONTWRITEBYTECODE=1 PYTHONNOUSERSITE=1 \
  TMPDIR="$KB/tmp" LOCAL_KNOWLEDGE_WORKSPACE="$KB" \
  python3 -B scripts/local-knowledge/run_kit_reference_dry_run.py \
  --run-name new-retailer-contract-fixture
```

A fresh run directory is mandatory; previous runs are preserved. The runner itself verifies withdrawal/restoration and leaves only isolated unapproved local review state. It keeps a withdrawal manifest for that fixture scope. No business record is deleted. Native rollback would require a before-state receipt, exact returned IDs/revisions and separate authorization to unpublish/unbind through the agreed path; no native rollback command is generated or run here.

## Remaining native prerequisites

1. Review these exact partial documents as retailer references. The source-backed field review is ready; user factual approval is still null.
2. Select an exact existing unpriced draft reference shell or specifically authorize creation of the selected reference identity. Read back the real product/variant IDs, handle/title and document ID. Retailer IDs and local fixture IDs must not be copied into these slots.
3. Compute the canonical revision again after real native binding. Record a genuine native review for that document/product/variant/revision, with review after source checking and validity within 90 days; publish through the agreed Strapi path when authorized.
4. Bind the reference role and explicit nonphysical simulation marker only after verified native review. Verify empty prices, one variant, draft status and checkout rejection. Coordinate exact-head release and staging activation through the parent.

Owning real stock, resolving every BOM/version/connector fact, or knowing Kurt's commercial kit SKU is not a prerequisite for the narrowly labelled external retailer reference. Those fields must be supplied only if they become claims in a commercial offering or exact kit contents/compatibility document.

## Browser capability evidence

`evaluation/native-reference-browser-capabilities.json` records this text task's actual tool availability: no callable browser controller, tab/DOM inspection or trusted browser Node REPL. `open_in_codex` can open/queue a panel but cannot inspect it. `capture_screen_context` is available only during active voice chat, which this task is not. Web screenshots are remote PDF-page images, not local desktop/browser screenshots. No tool, permission or credential change was attempted. The earlier server-HTML/API/drawer DOM checks remain valid within their stated scope; visual browser verification remains pending.

Validation: 28 Python tests passed, three actual native structural/approval-guard cases passed, six actual local coordinator lifecycle cases passed, Ruff F/E9 passed, and focused JavaScript no-unused-vars/no-undef, syntax and formatter checks passed. This does not replace the integration worker's full TypeScript, build or security gates. Medusa remains 2.15.5; Strapi remains 5.48.1. No staging writes, guide/FAQ ingestion or model calls occurred.
