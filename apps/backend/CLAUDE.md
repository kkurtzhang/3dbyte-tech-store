# Backend (Medusa v2.12.3)

> **Parent**: Read `/CLAUDE.md` first for monorepo rules.

## MCP Usage

| MCP | When to Use |
|-----|-------------|
| `medusa` | API docs, workflows, modules, services, subscribers |
| `meilisearch` | Index management, search queries, settings |
| `context7` | Other library docs (TypeORM, Zod, etc.) |

**Always query MCPs before implementing** - don't rely on memory for API patterns.

## Architecture

```
src/
├── api/           # REST routes (Store & Admin)
├── modules/       # Custom modules (brand, meilisearch, strapi)
├── workflows/     # Multi-step operations with rollback
├── subscribers/   # Event handlers
├── admin/         # Admin UI customizations
└── loaders/       # External service injection
```

## Key Patterns

### Workflows (Medusa v2)

```typescript
// Multi-step operations with automatic rollback
const myWorkflow = createWorkflow("my-workflow", (input) => {
  const step1 = validateStep(input);
  const step2 = processStep(step1);
  return new WorkflowResponse(step2);
});
```

**Multiple `useQueryGraphStep`**: Use `.config({ name: "unique-name" })` to avoid duplicate step errors.

**`transform` callback**: Data manipulation ONLY - no logging or side effects. Use steps for logging.

### Meilisearch Integration

- **Medusa is the aggregator**: Listens to product events → fetches Strapi content → pushes to Meilisearch
- **Only published products indexed**: Draft/proposed/rejected are deleted from index
- **Tests must wait**: `await client.waitForTask(task.taskUid)` before assertions

### Product Status Sync

| Medusa Status | Strapi Status | Result |
|---------------|---------------|--------|
| `published` | `published` | Synced with enrichment |
| `published` | `draft` | Synced without Strapi content |
| `draft/proposed/rejected` | Any | Deleted from index |

## Common Commands

```bash
pnpm --filter=@3dbyte-tech-store/backend dev     # Start dev server
pnpm --filter=@3dbyte-tech-store/backend build   # Build
npx typeorm migration:generate -n MigrationName  # Generate migration
```

## Environment Variables

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=...
STRAPI_URL=http://localhost:1337
STRAPI_API_KEY=...
```

## Gotchas

- Use `container.resolve()` for services, not direct imports
- Always use `atomicPhase_` for data modifications
- Explicitly specify relations in queries (not auto-loaded)
- Plugin order matters in `medusa-config.ts`
