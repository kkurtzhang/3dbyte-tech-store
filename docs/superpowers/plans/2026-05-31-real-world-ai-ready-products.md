# Real-World AI-Ready Products Plan

## Goal

Replace the Phase 1 synthetic `ai-*` seed catalogue with a source-backed launch catalogue that can be used as the starting point for production merchandising.

## Decisions

- Keep using the existing `seed:ai-ready-catalogue` and `seed:ai-ready-content` commands so staging runbooks do not split.
- Replace synthetic titles and media with real-world brand/product names, official product URLs, and official/supplier product image URLs.
- Keep structured AI facts in Medusa product metadata under `three_d_printing` and `rc_model_building`.
- Add source provenance metadata so future production review can distinguish official facts from shop merchandising assumptions.
- Archive legacy synthetic `ai-*` seed products by default before production-style verification; hard delete is available only through an explicit env switch.
- Move PolyDryer into drying/storage, not filament.
- Use China-origin brands for the nozzle/hotend slice: Phaetus, BIQU/BIGTREETECH, Trianglelab, Creality, Bambu Lab, and Mellow3D.
- Include 3D printing and 3DSets/RC build electronics/hardware from the first production-ready catalogue.

## Implementation Checklist

- Add product definition fields for brand, category, collection, tags, country of origin, and source metadata.
- Update seed tests to require real handles, source metadata, PolyDryer drying/storage classification, and China-origin nozzle/hotend products.
- Update the seed script to create/reuse categories, collections, and brands, then attach categories, collections, tags, and brand links after product upsert.
- Add a guarded legacy cleanup script that only targets old `ai-*` products with `metadata.ai_catalogue_seed = true` and the historical synthetic source marker.
- Allow source-backed product image hostnames in storefront image optimization.
- Update Phase 1 docs and future change register with the source-backed replacement path.
- Run focused backend tests and build before handoff.

## Verification

- `pnpm --filter=@3dbyte-tech-store/backend test:unit -- src/scripts/__tests__/ai-ready-catalogue.unit.spec.ts src/scripts/__tests__/seed-ai-ready-catalogue.unit.spec.ts src/scripts/__tests__/retire-legacy-ai-catalogue-products.unit.spec.ts`
- `pnpm --filter=@3dbyte-tech-store/backend build`
