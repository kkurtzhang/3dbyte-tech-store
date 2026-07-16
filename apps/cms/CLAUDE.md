# CMS (Strapi)

Apply the repo-root `AGENTS.md`, then these CMS-specific rules. Read the Strapi
version from `apps/cms/package.json` rather than this file.

## Ownership and boundaries

Strapi owns editorial content such as homepage sections, articles, guides,
policies, FAQs, brand/product descriptions, collections, campaign placements,
and public product documents. The current content-type inventory is the set of
directories under `src/api/`.

- `src/api/`: content types, controllers, routes, services, and lifecycles.
- `src/components/`: reusable content components.
- `src/extensions/`: supported customizations of installed plugins.
- `config/`: database, plugins, middleware, server, and admin configuration.
- `scripts/`: explicit content seeding and synchronization jobs.

Populate only required relations and fields. Preserve Draft & Publish behavior
and confirm that records intended for public APIs are published.

## Schema and extension policy

- Do not edit schema/content-type files for routine model changes unless the
  current user request explicitly authorizes that code-level change.
- Prefer the agreed Strapi Admin/API workflow for normal content-model updates.
- New plugins, lifecycle code, controllers, or plugin configuration require
  explicit task authorization and focused verification.
- Treat webhook delivery as fallible. Make consumers idempotent and verify
  revalidation or sync behavior at the receiving boundary.
- Keep Meilisearch indexes derived from published CMS content; do not use them
  as the content source of truth.

Check current Strapi v5 documentation for version-sensitive APIs. Do not reuse
Strapi v4 controller, query, or response patterns from memory.

## Commands

```bash
pnpm --filter=@3dbyte-tech-store/cms dev
pnpm --filter=@3dbyte-tech-store/cms build
pnpm --filter=@3dbyte-tech-store/cms strapi transfer
pnpm --filter=@3dbyte-tech-store/cms seed:blog-guides:api
pnpm --filter=@3dbyte-tech-store/cms seed:help-guides
```

The CMS has no standard automated test task. For CMS changes, run the build and
perform focused API/Admin verification against the affected content type or
integration. Do not claim automated coverage that does not exist.

## Configuration and safety

Use `apps/cms/.env.example` as the local variable contract. Never commit CMS
secrets or real content credentials. Validate public permissions, uploaded file
handling, webhook secrets, and admin-only operations when those boundaries
change.

For staging issues, compare the deployed revision, Strapi logs, database row or
API response, publication status, downstream index/webhook state, and visible
storefront behavior.
