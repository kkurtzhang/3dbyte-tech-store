# AI Engineer Pathway

This pathway captures the staged plan for making 3D Byte Tech Store useful to AI-assisted product discovery, support guidance, and future expert workflows.

## Phases

1. **Realistic Products**: prove a small AI-ready catalogue from fresh staging through Medusa, Strapi, Meilisearch, product documents, and assistant guidance.
2. **Expert Product Models**: add domain experts for print-process advice, RC model building, compatibility triage, and support handoff.
3. **Operational Feedback**: add evals, observability, future change tracking, and admin workflows so incoming product changes stay safe.

## Phase 1 Decision Record

- Fresh staging is the acceptance environment.
- Local DREMC data is reference/dev convenience only.
- Medusa product metadata stores compact structured AI facts.
- Strapi product descriptions own rich editorial content.
- Strapi product documents own manuals, SDS, datasheets, install guides, and warranty PDFs.
- Meilisearch keeps one product index in Phase 1; product metadata is flattened into existing product documents.
- Product documents remain in `product_documents_public`.
- No Medusa product module extension and no separate product metadata index in Phase 1.

## Key Docs

- [Phase 1 Realistic Products](./phase-1-realistic-products.md)
- [Future Change Register](./future-change-register.md)
