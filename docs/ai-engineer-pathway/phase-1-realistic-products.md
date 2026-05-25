# Phase 1: AI-Ready Realistic Products

## Goal

Prove the whole AI-ready product pipeline on fresh staging:

```text
fresh staging DB with 0 products
-> deploy metadata/indexing code
-> seed 25-30 AI-ready products
-> sync Meilisearch
-> add/sync product documents
-> verify storefront/search/assistant
```

## Data Placement

| Data | Owner | Notes |
| --- | --- | --- |
| Title, handle, variants, prices, stock, shipping profile | Medusa product/variant fields | Commerce data stays in native commerce fields. |
| Structured AI facts | Medusa `product.metadata` | Phase 1 uses namespaced metadata only. |
| Rich product copy | Strapi product descriptions | Editorial descriptions stay outside metadata. |
| Manuals, datasheets, SDS, install guides, warranty docs | Strapi product documents | Public search target remains `product_documents_public`. |
| Product search and assistant retrieval facts | Existing Meilisearch product index | Metadata is flattened into allowlisted `tdp_*` and `rcb_*` fields. |

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

The backend includes a deterministic catalogue of 25 AI-ready products with stable `ai-*` handles.

Command:

```bash
pnpm --filter=@3dbyte-tech-store/backend seed:ai-ready-catalogue
```

The seed script:

- upserts by stable handle;
- creates a default shipping profile if needed;
- creates/uses the default sales channel;
- creates missing products with variants, AUD prices, images, shipping profile, sales channel, and metadata;
- updates existing seeded products at product level without creating duplicates.

Use `AI_CATALOGUE_CURRENCY_CODE` to override `aud`, and `AI_CATALOGUE_SALES_CHANNEL_NAME` to override `Default Sales Channel`.

## Chunk A: Code and Docs

Status: implemented in `feature/ai-ready-realistic-products`.

Includes:

- metadata model and flattener;
- product sync fetching `metadata`;
- Meilisearch product index settings for `tdp_*` and `rcb_*`;
- `/ai/product-guidance` metadata-derived `aiContext`;
- deterministic AI-ready seed catalogue and command;
- docs and future change register.

## Chunk B: Staging Bring-Up

Run only after Coolify redeploys the backend image that contains Chunk A.

1. Confirm staging deployed the expected commit.
2. Run the AI catalogue seed command against staging.
3. Run product Meilisearch sync.
4. Run product document Meilisearch sync.
5. Add or seed matching Strapi descriptions.
6. Add or upload selected product documents: manual, datasheet, safety sheet, install guide, warranty where useful.
7. Verify storefront listing/search, product pages, product document downloads, Meilisearch flattened fields, and assistant answers.

## Staging Acceptance Checks

- Product listing/search finds `ai-*` products.
- Product pages show prices, stock state, rich content, and downloads where available.
- Product Meilisearch documents contain useful `tdp_*` and `rcb_*` fields.
- Product documents remain in `product_documents_public`.
- Assistant can answer:
  - Which PETG should I use for outdoor parts?
  - Do I need a hardened nozzle for carbon-fibre filament?
  - What hardware do I need for a 3DSets-style RC build?
  - Can you create a support ticket for compatibility help?
- Assistant does not invent stock, price, discounts, safety claims, or protected 3DSets model content.

## Local Testing Notes

Local DREMC data is useful for reference and regression checks, but Phase 1 acceptance happens on fresh staging after deploy. The `ai-*` handles avoid collisions with DREMC imports and make local reruns idempotent.
