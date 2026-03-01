# 3D Byte Tech Store - Monorepo Rules

## MCP-First Development

**Always use Context7 MCP** for library/API documentation, code generation, setup, or configuration steps without being explicitly asked.

### App-Specific MCPs

| App | MCPs to Use |
|-----|-------------|
| **Backend** (Medusa) | `medusa`, `meilisearch`, `context7` |
| **CMS** (Strapi) | `context7` (for Strapi docs) |
| **Storefront-v3** (Next.js) | `next-devtools`, `context7` |
| **All apps** | `serena` (semantic code analysis) |

**Chrome DevTools MCP**: When using `take_snapshot` or `take_screenshot`, set `filePath` to `mcp-files/chrome-devtools`.

## Project Structure

```
apps/
├── backend/       # Medusa v2.12.3 - Headless commerce
├── cms/           # Strapi v5.33.0 - Content management
├── storefront/    # Reference code (skip)
└── storefront-v3/ # Next.js 16.1.0 - Customer store

packages/
├── shared-config/ # ESLint, TypeScript, Prettier configs
├── shared-types/  # Common TypeScript definitions
└── shared-utils/  # Utility functions
```

## Before Every Task

1. Read app-specific `CLAUDE.md` in the workspace you're modifying
2. Check `packages/shared-types` for existing type definitions
3. Use workspace protocol: `"@3dbyte-tech-store/shared-ui": "workspace:*"`

## Workspace Commands

```bash
pnpm add <pkg> --filter=@3dbyte-tech-store/<workspace>  # Add dependency
pnpm --filter=@3dbyte-tech-store/storefront-v3 dev      # Run single app
pnpm run dev                                             # All apps
pnpm run build:turbo                                     # Optimized build
```

## Code Standards

- **Max file size**: 400 lines (ideal: 200-300)
- **No `any` types** without justification
- **Import order**: External > Workspace (@3dbyte-tech-store/*) > Internal (~/) > Relative > Types

## Testing

| App | Tools |
|-----|-------|
| Backend | Jest + supertest |
| CMS | Jest + Strapi utils |
| Storefront | Jest + RTL + Playwright |

**Meilisearch tests**: Use `client.waitForTask(task.taskUid)` before assertions.

## Git Workflow

**Conventional commits**: `feat(backend):`, `fix(storefront):`, `docs(cms):`

**Branch naming**: `feature/[app]-description`, `fix/[app]-issue`

## Worktree Management

**Crucial**: When creating a new worktree, AUTOMATICALLY copy all `.env` files from the main worktree to the new worktree (including those in subdirectories) without asking.

## Security

- Never commit `.env` files
- Validate all user inputs
- Use parameterized queries
- Each app has its own `.env` file

## Data Flow Architecture

```
Medusa (Products) <-> Strapi (Content) -> Meilisearch (Index) <- Storefront (Consumer)
```

**Pattern**: Storefront Composition - parallel fetching from multiple sources for resilience and performance.
