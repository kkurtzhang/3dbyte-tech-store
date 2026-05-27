# AI-Ready Realistic Products Implementation Checklist

## Chunk A: Code and Docs

- [x] Create isolated worktree from latest `origin/staging`.
- [x] Copy local untracked `.env` files into the worktree without tracking them.
- [x] Add `metadata.three_d_printing` and `metadata.rc_model_building` schema guidance.
- [x] Fetch product `metadata` in product sync workflows.
- [x] Flatten allowlisted metadata into existing product Meilisearch documents as `tdp_*` and `rcb_*`.
- [x] Ignore malformed or unknown metadata safely.
- [x] Update product index settings for useful AI metadata fields.
- [x] Add metadata-derived AI context to `/ai/product-guidance`.
- [x] Keep product documents in `product_documents_public`.
- [x] Add deterministic `ai-*` seed catalogue for 25-30 realistic products.
- [x] Add seed command that upserts by stable handle.
- [x] Add pathway docs and future change register.

## Chunk A Verification

- [x] `pnpm --filter=@3dbyte-tech-store/backend test:unit -- src/modules/meilisearch/utils`
- [x] `pnpm --filter=@3dbyte-tech-store/backend test:unit -- src/modules/meilisearch/loaders/__tests__/configure-product-index.unit.spec.ts`
- [x] `pnpm --filter=@3dbyte-tech-store/backend test:unit -- src/api/ai/__tests__/internal-routes.unit.spec.ts`
- [x] `pnpm --filter=@3dbyte-tech-store/backend test:unit -- src/scripts/__tests__/ai-ready-catalogue.unit.spec.ts`
- [x] `pnpm --filter=@3dbyte-tech-store/backend build`

## Chunk B: Staging Bring-Up

- [ ] Confirm Coolify redeployed the expected commit.
- [ ] Run `pnpm --filter=@3dbyte-tech-store/backend seed:ai-ready-catalogue` against staging.
- [ ] Run product Meilisearch sync.
- [ ] Run product document Meilisearch sync.
- [ ] Add or seed matching Strapi product descriptions.
- [ ] Add selected product documents.
- [ ] Verify storefront product listing/search and product pages.
- [ ] Verify Meilisearch product documents contain `tdp_*` and `rcb_*`.
- [ ] Verify assistant answer and support-ticket guardrails.

## Phase 1 Regression Re-Close

- [x] Add regression coverage for PDP rich-description loading from Strapi product descriptions.
- [x] Move PDP rich descriptions below the image gallery instead of the purchase column.
- [x] Add regression coverage for product-document download filenames and backend media proxying.
- [x] Repair the content seed so stale AI document media is replaced or retired.
- [ ] Deploy the regression branch to staging.
- [ ] Rerun `seed:ai-ready-content` against staging.
- [ ] Rerun product-document Meilisearch sync.
- [ ] Verify PDP rich descriptions, PDF downloads, Download Center results, and assistant smoke on staging.
