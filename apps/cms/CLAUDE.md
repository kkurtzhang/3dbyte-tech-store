# CMS (Strapi v5.33.0)

> **Parent**: Read `/CLAUDE.md` first for monorepo rules.

## MCP Usage

| MCP | When to Use |
|-----|-------------|
| `context7` | Strapi v5 docs, API patterns, plugins, lifecycle hooks |
| `meilisearch` | Search index configuration (if using Meilisearch plugin) |

**Always query Context7 for Strapi docs** - API changed significantly in v5.

## Architecture

```
src/
├── api/           # Content types & controllers
├── components/    # Reusable content components
├── extensions/    # Extend Strapi functionality
├── middlewares/   # Custom middleware
└── plugins/       # Custom plugins

config/
├── database.ts    # Database config
├── plugins.ts     # Plugin settings (S3, Meilisearch)
└── middlewares.ts # Middleware registration
```

## Content Types

### This Project's Content Types

| Type | Purpose |
|------|---------|
| Brand descriptions | Rich content for brands |
| Product descriptions | Marketing content for products |
| Product variant colors | Color metadata |
| Blog posts & categories | Blog content |
| Collections | Product collections |
| Homepage, About, FAQ, etc. | Static pages |

### Key Patterns

```typescript
// Custom controller
export default factories.createCoreController(
  'api::blog-post.blog-post',
  ({ strapi }) => ({
    async findBySlug(ctx) {
      const { slug } = ctx.params;
      const entity = await strapi.db.query('api::blog-post.blog-post')
        .findOne({ where: { slug }, populate: ['author'] });
      return this.transformResponse(entity);
    }
  })
);
```

### Lifecycle Hooks

Use for: auto-slug generation, webhook triggers, search indexing, audit logging.

Location: `src/api/[content-type]/content-types/[name]/lifecycles.ts`

## Webhooks to Storefront

Configure webhooks to trigger Next.js revalidation on content changes:
- `entry.create`, `entry.update`, `entry.delete`
- `entry.publish`, `entry.unpublish`

## Common Commands

```bash
pnpm --filter=@3dbyte-tech-store/cms dev     # Start dev server (port 1337)
pnpm --filter=@3dbyte-tech-store/cms build   # Build admin
pnpm --filter=@3dbyte-tech-store/cms strapi transfer  # Data transfer
```

## Environment Variables

```bash
HOST=0.0.0.0
PORT=1337
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_NAME=cms
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
MEILISEARCH_HOST=http://localhost:7700
```

## Gotchas

- **Populate depth**: Deep population kills performance - specify only needed fields
- **Draft & Publish**: Remember to publish entries for API access
- **Permissions**: Public access requires explicit configuration in Settings
- **Circular dependencies**: Be careful with bidirectional relations
- **Webhooks don't retry**: Test thoroughly
