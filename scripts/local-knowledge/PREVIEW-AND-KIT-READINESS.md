# Local preview and retailer kit readiness

This follow-up starts from the handed-off head `a42067dfef59f017e951d2f821e8c867d80ff4f3` on a separate branch, `fix/knowledge-preview-kit-review-20261013`. The two handed-off commits and their runtime files are unchanged. Medusa remains 2.15.5 and Strapi remains 5.48.1; no dependency, credential, native data, integration branch or deployment changes occurred.

## Before and after preview evidence

Before this check, the local API and source-link unit tests passed, but no whole-drawer check had consumed captured actual project responses. Now the help and FAQ pages return HTTP 200, their HTML contains the assistant button, six live response cases pass, and the actual drawer renders those captured responses correctly in six DOM tests.

| Question or sequence | Visible response checked in the drawer |
| --- | --- |
| Manufacturer package for part 4007010136 | Four red levelling nuts and four mould springs; manufacturer source link below the message. |
| Compare TPU95-HF and PA6-CF20, then “How do I dry it?” | Requests the intended material; no source links or invented drying cycle. |
| Assemble model 11 Sandy | Publisher product page and official public presentation link for guide v1.0. |
| 3D Sets FAQ | Official FAQ link with its 2021 date; no extracted FAQ answer. |
| Sandy guide v2.0 | Exact guide revision remains unverified; no substitution of the v1.0 presentation. |
| Sandy kit: STLs/radio/stock | Actual store contents, digital access and commerce facts remain unknown. |

All links were checked for their actual captured URL, HTTPS, new-tab behavior and `noopener noreferrer`. The reply prefix and response header identify deterministic local context/resource routing. No model generation or model-quality evaluation was performed.

These are API, server HTML and component DOM checks. This text execution session exposes no trusted browser-control/inspection tool; no browser layout, click-through, mobile or screenshot verification is claimed. Opening `http://127.0.0.1:3005/help` in the local Codex browser panel was queued for this hidden task. The URL is usable directly in the user's local browser. Services remain bound to 127.0.0.1 only.

To preview, open that URL, click the Shopping assistant button and send the questions above. The existing two-service start procedure remains in `README.md`. Current response fixtures are in `apps/storefront-v3/scripts/__tests__/fixtures/local-knowledge-preview.json`; their companion drawer test is `local-knowledge-preview.test.tsx`.

## Three retailer sample kits checked

Fresh public retailer data matches all three indexed SKU/variant/title/price/availability observations. Prices and availability are third-party capture-time observations, not Kurt's live offer or inventory.

| Retailer SKU | Family | Observed AUD price | Supplier BOM observations |
| --- | --- | --- | --- |
| WES2487 | Buggy / Buggster / Sandy | 224.95 | 20 bearings; 2 each of 60XL/80XL belts; 4 × 55 mm shocks; 4 offroad tyres. |
| WES2488 | Landy | 244.95 | 40 bearings; 4 HTD144-3M-06 belts; 4 × 85 mm shocks; 5 offroad tyres. |
| WES2489 | Sakura | 249.00 | 30 bearings; 4 HTD144-3M-06 belts; 4 × 55 mm shocks; 4 onroad plus 2 stadium tyres. |

The review now includes **87** exact-source fastener/component rows across the three supplier BOM tabs (28, 30, 29). Each has a source version, text hash, character locator and excerpt hash. Five immutable raw/text source snapshots were saved on the external SSD; none replaced prior source bytes. Source URLs and hashes are in `evaluation/retailer-kit-review-v1.json`. Supplier tab quantities describe that published table, not confirmed contents of an exact store kit.

The retailer excludes radio transmitter/receiver, battery/charger, printed model parts/STLs, grease and threadlocker. Its title names 3DMakerParts while the vendor field says West3D; their relationship and the exact kit manufacturer remain unresolved. ESC input/battery connector wording names both XT60 and TAMIYA; connector type stays null. The Sakura small-servo row has no quantity, so it remains null. Landy model 16 marked SOON does not establish present compatibility. BOM tabs match family names but do not explicitly bind a retailer SKU or published kit revision; exact release compatibility remains null.

Wire quantity is preserved literally as “1 meter”. It is not converted into an item count or stock quantity. All actual store identifiers, contents, price, stock and digital-access fields remain null. The review is an agent local observation, not a native approval. These records have not been imported into SQLite, Medusa or Strapi; the handed-off active corpus and vector index remain unchanged. No official guide or FAQ content was ingested.

## Exact native import and store mapping prerequisites

1. Select the actual store SKU, Medusa product/variant IDs, handle/title and Strapi product-document documentId. Retailer variant IDs are not Medusa IDs.
2. Bind the supplier package and BOM/kit revision to the intended 3D Sets model release, body and gearbox options. Family-name matches alone do not establish this binding.
3. Confirm included/excluded electronics, printed parts, fasteners, connector type and digital access/licence scope for that store kit. Supplier table observations remain separate from official model requirements.
4. Prepare a single-source bounded document with a verified source version/hash/date, plain text and exact evidence excerpts. The current body contract allows at most 30 facts per document, values up to 500 characters and text up to 20,000 characters. Add unresolved facts as null with empty excerpts.
5. Review source-kind classification: `supplier_product_page` is allowed; `supplier_BOM` and `source_link_index` are not current enum values. A hardware BOM must not be relabelled as an official model manual to pass validation.
6. Use the agreed Strapi path to review and publish. Approval must match the exact document/product/variant/revision, occur after source checking, and expire within 90 days. Public publication metadata is also required. No approval timestamp, hash or native identity was fabricated here.
7. Fetch actual prices/inventory/delivery from commerce and complete parent-coordinated release checks before native use.

## Verification and remaining blockers

Passed: six live project-response cases, six drawer DOM cases, twenty Python tests (including eight retailer-source/unknown-promotion regressions), configured JavaScript ESLint gate and Ruff F/E9 checks. Source verification passed 3 records, 5 archived source versions and 87 located observations. Tests reject changed retailer identity/price, changed supplier quantities, hash drift, unverified stock/approval, resolved connector conflicts, invented small-servo quantities, premature model 16 fit and wire-to-count conversion.

After local page rendering caused Next to generate dev layout checks, the canonical full storefront TypeScript command failed at `.next/dev/types/app/layout.ts:39` with a `ReactNode` mismatch. Type resolution includes both React 18.3.27 and 19.2.7 definitions from the borrowed installed dependency tree. No source layout or dependency configuration was changed. A source/test-only diagnostic excluding generated dev checks passed; it is diagnostic evidence and does not replace or waive the failed full gate. The clean combined integration checkout must run its exact-head type/build gates with coherent existing dependencies.

Browser visual verification, genuine model-generation evaluation, actual kit mapping, source-kind review and native approvals remain pending. The separate security integration and release blockers stay with the parent; this follow-up does not alter or bypass them.

Run the offline kit verifier with the existing SSD workspace:

```sh
LOCAL_KNOWLEDGE_WORKSPACE=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013 \
  PYTHONDONTWRITEBYTECODE=1 python3 -B scripts/local-knowledge/verify_retailer_kit_evidence.py \
  --report new-kit-verification.json
```

Choose a new report name. Raw source snapshots stay outside Git under the existing SSD workspace; the committed review contains relative locators and source hashes only.
