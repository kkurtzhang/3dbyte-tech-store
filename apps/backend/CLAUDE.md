# Backend (Medusa)

Apply the repo-root `AGENTS.md`, then these backend-specific rules. Read the
Medusa version from `apps/backend/package.json` rather than this file.

## Ownership and boundaries

- Medusa is the source of truth for catalogue, inventory, carts, orders,
  customers, payments, shipping, and custom commerce modules.
- `src/api/` contains Store/Admin routes and middleware.
- `src/modules/` contains custom domain and integration modules.
- `src/workflows/` contains recoverable multi-step operations.
- `src/subscribers/` and `src/jobs/` react to events or schedules.
- `src/admin/` contains Medusa Admin extensions.
- Shared cross-app contracts belong in `packages/shared-types`.

Use container resolution for registered services. Keep business operations in
modules/workflows instead of embedding them in route handlers.

## Medusa and search patterns

- Check current Medusa v2 documentation before using framework APIs that are
  not already demonstrated in this codebase.
- Give repeated `useQueryGraphStep` instances unique `.config({ name })`
  values inside one workflow.
- Keep workflow `transform` callbacks deterministic and side-effect free; use a
  step for logging or I/O.
- Medusa aggregates product state with Strapi enrichment and publishes derived
  documents to Meilisearch. Do not treat the index as authoritative state.
- Only index the intended published/active records, and remove stale documents
  when source records leave that state.
- Await `client.waitForTask(taskUid)` before asserting Meilisearch results.
- Do not use legacy TypeORM CLI instructions for Medusa module migrations;
  verify the current module migration command first.

## Commands

```bash
pnpm --filter=@3dbyte-tech-store/backend dev
pnpm --filter=@3dbyte-tech-store/backend build
pnpm --filter=@3dbyte-tech-store/backend test:unit
pnpm --filter=@3dbyte-tech-store/backend test:integration:http
pnpm --filter=@3dbyte-tech-store/backend test:integration:modules
pnpm --filter=@3dbyte-tech-store/backend seed
```

Start with the smallest matching Jest suite. Integration tests may require
PostgreSQL, Redis, Meilisearch, Strapi, or other configured services.

## Configuration and security

Use `apps/backend/.env.template` as the local variable contract. Important
boundaries include `DATABASE_URL`, Redis, Strapi, Meilisearch, internal AI
tokens, OAuth, payment, shipping, email, media, and observability credentials.
Do not copy values into documentation or tests.

For Store/Admin routes:

- validate request bodies, query parameters, and headers;
- verify actor scope and authorization before resolving protected data;
- bound payload size and expensive operations;
- return user-safe errors while logging enough server-side context to diagnose
  failures.

For staging bugs, verify the deployed API request, runtime logs, database/module
state, downstream service state, and release SHA before declaring resolution.
