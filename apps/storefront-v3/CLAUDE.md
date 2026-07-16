# Storefront v3 (Next.js)

Apply the repo-root `AGENTS.md`, then these storefront-specific rules. Read the
Next.js and React versions from `apps/storefront-v3/package.json`.

The development server binds to `127.0.0.1:3001`.

## Ownership and architecture

- `src/app/`: App Router pages, layouts, route handlers, and server actions.
- `src/features/`: feature-oriented UI and domain behavior.
- `src/components/`: shared components.
- `src/lib/`: Medusa, Strapi, search, security, and other integrations.
- `src/context/` and `src/lib/hooks/`: client-side state and reusable hooks;
  feature-local hooks may live beside their components.
- `content/`: repository-managed MDX content.

Use Medusa for transactional commerce, Strapi for editorial content, and
Meilisearch for discovery. Search code deliberately falls back between
Meilisearch and Medusa in selected flows; preserve and test those resilience
paths.

## Next.js and UI patterns

- Prefer Server Components. Add `'use client'` only for browser APIs, event
  handlers, or client state.
- Treat `params` and `searchParams` as async where required by the pinned
  Next.js version.
- Keep server-only secrets and SDK clients out of client bundles.
- After mutations, invalidate the narrow path or cache tag that owns the data.
- Fetch independent sources in parallel when the page can tolerate partial
  content failure.
- Preserve accessibility, loading, empty, error, and mobile states when
  changing customer flows.
- Use runtime/browser diagnostics for runtime UI issues when a dev server is
  available; static code issues do not require a server-first ritual.

## Commands

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 dev
pnpm --filter=@3dbyte-tech-store/storefront-v3 build
pnpm --filter=@3dbyte-tech-store/storefront-v3 lint
pnpm --filter=@3dbyte-tech-store/storefront-v3 test
pnpm --filter=@3dbyte-tech-store/storefront-v3 test:coverage
pnpm --filter=@3dbyte-tech-store/storefront-v3 test:coverage:critical
pnpm exec playwright test
```

For component work, use React Testing Library and user-visible assertions. For
authentication, account, cart, checkout, order, and search regressions, add the
narrowest useful unit/integration test and use Playwright when browser state or
cross-page behavior is central.

## Configuration and security

Use `apps/storefront-v3/.env.example` as the variable contract. The Medusa URL
is `NEXT_PUBLIC_MEDUSA_BACKEND_URL`; do not introduce the obsolete
`NEXT_PUBLIC_MEDUSA_URL` name. Expose only deliberately public values with a
`NEXT_PUBLIC_` prefix.

Authentication, checkout, CSP reporting, support, newsletter, revalidation,
and AI-assistant routes are security boundaries. Validate and bound inputs,
preserve authorization/session behavior, protect internal tokens, and avoid
logging personal data or model secrets.

For staging issues, reproduce the live browser or API request and verify the
deployed `releaseSha`, backend/CMS/search response, session behavior, and final
rendered state.
