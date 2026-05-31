# Phase 1: AI-Ready Realistic Products

## Goal

Prove the whole AI-ready product pipeline on fresh staging:

```text
fresh staging DB with 0 products
-> deploy metadata/indexing code
-> seed source-backed real-world AI-ready products
-> sync Meilisearch
-> add/sync product documents
-> verify storefront/search/assistant
```

## Data Placement

| Data                                                     | Owner                              | Notes                                                              |
| -------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Title, handle, variants, prices, stock, shipping profile | Medusa product/variant fields      | Commerce data stays in native commerce fields.                     |
| Structured AI facts                                      | Medusa `product.metadata`          | Phase 1 uses namespaced metadata only.                             |
| Rich product copy                                        | Strapi product descriptions        | Editorial descriptions stay outside metadata.                      |
| Manuals, datasheets, SDS, install guides, warranty docs  | Strapi product documents           | Public search target remains `product_documents_public`.           |
| Product search and assistant retrieval facts             | Existing Meilisearch product index | Metadata is flattened into allowlisted `tdp_*` and `rcb_*` fields. |

## Metadata Namespaces

All Phase 1 AI metadata lives under each Medusa product's `metadata` object.

```json
{
  "three_d_printing": {
    "schema_version": 1,
    "product_kind": "filament",
    "material": "PETG",
    "diameter_mm": 1.75,
    "recommended_nozzle_temp_c": { "min": 230, "max": 250 },
    "recommended_bed_temp_c": { "min": 70, "max": 85 },
    "requires_enclosure": false,
    "requires_hardened_nozzle": false,
    "drying_recommended": true,
    "best_for": ["functional parts", "outdoor brackets"]
  },
  "rc_model_building": {
    "schema_version": 1,
    "component_role": "print_material",
    "compatible_project_types": ["3d_printed_rc_car"],
    "used_for": ["body panels", "light-duty brackets"]
  }
}
```

`metadata.three_d_printing` is for print-process facts, regardless of whether the product is filament, nozzles, build surfaces, drying/storage, or maintenance.

`metadata.rc_model_building` is for 3DSets-style RC build facts, including electronics and hardware such as motors, ESCs, servos, bearings, fastener kits, batteries, and connector packs.

Products may have one namespace, both namespaces, or neither. Malformed namespaces are ignored by indexing and assistant guidance.

## Meilisearch Flattening

Phase 1 flattens allowlisted metadata into the existing product document:

- `three_d_printing` -> `tdp_*`
- `rc_model_building` -> `rcb_*`

Examples:

- `metadata.three_d_printing.material` -> `tdp_material`
- `metadata.three_d_printing.requires_hardened_nozzle` -> `tdp_requires_hardened_nozzle`
- `metadata.rc_model_building.component_role` -> `rcb_component_role`
- `metadata.rc_model_building.connector_type` -> `rcb_connector_type`

Unknown or malformed metadata is intentionally dropped. The product still indexes normally.

## Seed Catalogue

The backend includes a deterministic source-backed catalogue of 35 real-world AI-ready products with stable production-style handles.

Command:

```bash
pnpm --filter=@3dbyte-tech-store/backend seed:ai-ready-catalogue
```

The seed script:

- upserts by stable handle;
- creates a default shipping profile if needed;
- creates/uses the default sales channel;
- creates/reuses missing categories, collections, and brands needed by the catalogue;
- creates missing products with variants, AUD prices, official/supplier product images, shipping profile, sales channel, and metadata;
- updates existing seeded products at product level without creating duplicates.
- attaches category, collection, tag, and custom brand relations after product upsert.

Use `AI_CATALOGUE_CURRENCY_CODE` to override `aud`, and `AI_CATALOGUE_SALES_CHANNEL_NAME` to override `Default Sales Channel`.

The source-backed catalogue uses official/supplier product image URLs. Storefront image optimization includes the current launch-source host allowlist, and production can extend it with `NEXT_PUBLIC_PRODUCT_IMAGE_HOSTS`.

The original 29 synthetic `ai-*` products remain historical staging evidence only. They should not be treated as production seed data.

Retire those legacy synthetic products after the source-backed code deploys:

```bash
pnpm --filter=@3dbyte-tech-store/backend exec medusa exec ./src/scripts/retire-legacy-ai-catalogue-products.ts
```

The cleanup script archives only products with all three old-seed markers: an `ai-*` handle, `metadata.ai_catalogue_seed = true`, and `metadata.source = "3dbyte-ai-ready-catalogue"`. Archive mode is the default and sets matching products to `draft` with retirement metadata so they drop out of product sync without destroying audit history. Hard delete is available only with `AI_CATALOGUE_LEGACY_CLEANUP_MODE=delete`.

### Source-Backed Launch Coverage

- Filaments: Polymaker, eSUN, and Bambu Lab PLA/PETG/ASA/TPU/support/specialty materials.
- Drying/storage: PolyDryer, PrintDry PRO3, and SUNLU FilaDryer S4. PolyDryer is classified as `metadata.three_d_printing.product_kind = drying_storage`, not filament.
- Build surfaces/adhesion: Bambu Textured PEI, BIQU Panda CryoGrip Pro, and Magigoo Original.
- Nozzles/hotends: China-origin brands only for this slice: Phaetus, BIQU, Trianglelab, Creality, Bambu Lab, and Mellow3D.
- 3DSets/RC build electronics and hardware: Hobbywing ESCs, FlySky/RadioMaster radio gear, RC Printer motor/ESC combo, AGFRC servo, Avid bearings, INJORA fasteners, and Amass XT60 connectors.

Every source-backed product includes:

- `brandName`, `brandHandle`, and `brandOriginCountry`;
- `categoryHandle`, `collectionHandle`, and tags;
- `source.official_product_url`;
- `source.official_image_url`;
- `source.source_checked_at`;
- structured `metadata.three_d_printing` and/or `metadata.rc_model_building` where applicable.

## CMS Content and Documents Seed

The backend also includes a deterministic CMS content seed for the AI-ready catalogue.

Command:

```bash
pnpm --filter=@3dbyte-tech-store/backend seed:ai-ready-content
```

The content seed:

- upserts rich Strapi product descriptions for every source-backed catalogue product by Medusa product id;
- generates metadata-derived feature lists, specifications, SEO fields, and search keywords;
- creates or updates public product documents for each product;
- uploads generated Phase 1 PDF files to Strapi before linking them to `product-document` entries;
- leaves existing document entries idempotent by matching `medusa_product_id` plus document title.
- repairs desired AI-ready document entries when the attached Strapi media is missing, not a PDF, or has the wrong filename;
- retires legacy public AI document entries that are outside the deterministic seed set and still point at text/no-extension media.

The command requires `STRAPI_API_TOKEN` with create/update/upload permissions and uses `STRAPI_API_URL` or `STRAPI_URL`, defaulting to `http://cms:1337` inside the deployed Compose network.

## Chunk A: Code and Docs

Status: implemented in `feature/ai-ready-realistic-products`.

Includes:

- metadata model and flattener;
- product sync fetching `metadata`;
- Meilisearch product index settings for `tdp_*` and `rcb_*`;
- `/ai/product-guidance` metadata-derived `aiContext`;
- deterministic AI-ready seed catalogue and command;
- deterministic AI-ready CMS content/document seed command;
- storefront-hosted AI catalogue media assets;
- docs and future change register.

## Chunk B: Staging Bring-Up

Status: complete on staging.

Staging was brought up from the deployed `staging` branch with:

1. Legacy synthetic `ai-*` product retirement.
2. AI catalogue reseed into the `Web Store` sales channel.
3. AI content seed for Strapi product descriptions and public product documents.
4. Product Meilisearch sync.
5. Product-document Meilisearch sync into `stg_product_documents_public`.
6. Storefront, search, downloads, browser image, and assistant product-guidance verification.

## Staging Acceptance Checks

- Product listing/search finds the source-backed product handles.
- Product pages show prices, stock state, rich content, and downloads where available.
- Product Meilisearch documents contain useful `tdp_*` and `rcb_*` fields.
- Product documents remain in `product_documents_public`.
- Assistant can answer:
  - Which PETG should I use for outdoor parts?
  - Do I need a hardened nozzle for carbon-fibre filament?
  - What hardware do I need for a 3DSets-style RC build?
  - Can you create a support ticket for compatibility help?
- Assistant does not invent stock, price, discounts, safety claims, or protected 3DSets model content.

## Staging Verification Evidence

Last updated: 2026-05-27

Current technical acceptance status: closed for Phase 1 staging after PR #93 / `d1a1694` deployed, the content seed repaired stale document media, product documents were rebuilt in Meilisearch, and assistant smoke passed.

Evidence captured:

- Deployed staging commits:
  - PR #88 `67e0372`: Phase 1 content closeout tooling, generated media, Strapi content/document seed.
  - PR #89 `3e09b2e`: generated media included in seed create inputs.
  - PR #90 `18671cf`: existing seeded products update `thumbnail` during reseed.
  - PR #91 `3e90ac4`: storefront image optimizer allows env-derived AI catalogue media hosts.
  - PR #93 `d1a1694`: PDP rich descriptions load from current Strapi schema, render below the gallery, document downloads proxy public media with safe PDF filenames, and stale AI document media is repaired or retired during content seed.
- Catalogue reseed completed idempotently with `created=0`, `updated=29`, `total=29` using `AI_CATALOGUE_SALES_CHANNEL_NAME="Web Store"` and staging media base URL.
- Content seed completed with 29 product descriptions and public product documents for every AI-ready product.
- Product sync indexed 29 documents into Meilisearch product index `stg_products`.
- Regression content seed completed with `products=29`, `descriptions_updated=29`, `documents_updated=58`, and `documents_retired=6`.
- Product-document index was rebuilt with 58 public documents in `stg_product_documents_public`.
- Storefront HTTP checks passed:
  - generated PNG `200`;
  - `/products/ai-petg-black-175-1kg` `200`;
  - `/api/products/by-handle/ai-petg-black-175-1kg` `200` with generated PNG thumbnail;
  - `/search?q=PETG` `200` and contains PETG;
  - `/downloads?q=PETG` `200` and contains AI-ready PDF product documents;
  - `/api/product-documents/kk5zztwey1p8inhnl6gygonn/download` `200 application/pdf` with `filename="ai-petg-cf-black-175-1kg-safety-sheet.pdf"`;
  - `/api/product-documents/otll970k7rj398wo1asses3d/download` `200 application/pdf` with `filename="ai-petg-black-175-1kg-datasheet.pdf"`.
- Browser QA passed on the PETG product page:
  - page title visible;
  - no `placehold.co` product image;
  - Next optimized image uses `/ai-catalogue/products/ai-petg-black-175-1kg.png`;
  - optimized image loaded at `640x640`;
  - rich description appears below the gallery and includes AI-ready Strapi copy;
  - browser console had 0 errors and 0 warnings.
- Meilisearch sample product `ai-petg-black-175-1kg` contains:
  - generated thumbnail under `https://store.staging.3dbytetech.com.au/ai-catalogue/products/`;
  - `tdp_material: PETG`;
  - `tdp_product_kind: filament`;
  - `tdp_requires_hardened_nozzle: false`;
  - `rcb_component_role: print_material`.
- Product index settings include useful AI filters:
  - `tdp_material`;
  - `tdp_requires_hardened_nozzle`;
  - `rcb_component_role`.
- `/ai/product-guidance` returned `200` for `PETG outdoor parts`, with 3 products, canonical storefront `productUrl`, metadata-derived `aiContext`, rich Strapi context, and authoritative context from Medusa, Meilisearch, and Strapi.
- Assistant smoke prompts returned `200 text/event-stream` for PETG outdoor parts, carbon-fibre nozzle guidance, 3DSets-style RC hardware, and support-ticket handoff.
- PETG search includes compatible accessories intentionally because `tdp_best_for` marks brass V6 nozzles as suitable for non-abrasive PETG and the bed release stick/build plates as useful for PETG bed adhesion/release.
- Support-ticket handoff guardrail held: the assistant did not call `createSupportTicket` without required customer confirmation and contact details.

Remaining follow-ups after Phase 1:

- Assistant product-card rendering from structured tool output remains a future improvement; model-authored product links are now grounded through `productUrl`.
- Future real supplier/manufacturer product media can replace the generated Phase 1 catalogue media when approved source assets are available.
- Dependency security upgrades are tracked separately in `docs/storefront-backend-next-todo.md`.

## Local Testing Notes

Local DREMC data is useful for reference and regression checks, but Phase 1 acceptance happens on fresh staging after deploy. Source-backed launch handles are production-style and still stable/idempotent, so local reruns do not create duplicates.
