# Storefront v3 (Next.js 16.1.0)

> **Parent**: Read `/CLAUDE.md` first for monorepo rules.

## MCP Usage

| MCP | When to Use |
|-----|-------------|
| `next-devtools` | Next.js 16 docs, App Router, Server Components, Cache Components |
| `context7` | React 19, Tailwind, Radix UI, other library docs |
| `meilisearch` | Search queries, filtering, facets |
| `chrome-devtools` | UI testing, screenshots (use `filePath: mcp-files/chrome-devtools`) |

**Always use `nextjs_index` and `nextjs_call`** for runtime diagnostics before debugging.

## Tech Stack

- **Framework**: Next.js 16.1.0 (App Router, Server Components)
- **React**: 19.2.3
- **Styling**: Tailwind CSS + Medusa UI
- **Forms**: React Hook Form + Zod
- **Search**: Meilisearch client v0.36.0
- **Payments**: Stripe
- **State**: React Context + Server Actions + nuqs (URL state)

## Architecture

```
src/
├── app/           # App Router pages & layouts
├── components/    # React components
├── lib/           # Utilities, API clients
├── hooks/         # Custom React hooks
└── types/         # TypeScript definitions
```

## Key Patterns

### Data Fetching (Storefront Composition)

Fetch from multiple sources in parallel for resilience:

```typescript
// In Server Component
const [products, content] = await Promise.all([
  fetchFromMedusa('/products'),
  fetchFromStrapi('/product-descriptions'),
]);
```

### Search with Meilisearch

```typescript
const results = await meilisearchClient
  .index('products')
  .search(query, {
    filter: ['status = published'],
    facets: ['categories', 'brand'],
  });
```

### Server Actions

```typescript
'use server'

export async function addToCart(productId: string) {
  // Server-side cart logic
  revalidatePath('/cart');
}
```

## Common Commands

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 dev    # Start dev (port 3000)
pnpm --filter=@3dbyte-tech-store/storefront-v3 build  # Production build
pnpm --filter=@3dbyte-tech-store/storefront-v3 lint   # Lint
```

## Environment Variables

```bash
NEXT_PUBLIC_MEDUSA_URL=http://localhost:9000
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_MEILISEARCH_HOST=http://localhost:7700
NEXT_PUBLIC_MEILISEARCH_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

## Gotchas

- **Server vs Client**: Default is Server Component - add `'use client'` only when needed
- **Async params**: In Next.js 16, `params` and `searchParams` are async
- **Cache Components**: Use `'use cache'` directive for caching (Next.js 16 feature)
- **Revalidation**: Use `revalidatePath` or `revalidateTag` after mutations
- **Public env vars**: Must prefix with `NEXT_PUBLIC_`
