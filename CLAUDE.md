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
├── backend/       # Medusa v2.13.3 - Headless commerce
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
3. Use workspace protocol for existing internal packages, for example:
   - `"@3dbyte-tech-store/shared-config": "workspace:*"`
   - `"@3dbyte-tech-store/shared-types": "workspace:*"`
   - `"@3dbyte-tech-store/shared-utils": "workspace:*"`
4. If you're modifying `packages/*`, read the root `CLAUDE.md` first because those workspaces do not have package-local `CLAUDE.md` files.

## Workspace Commands

```bash
pnpm add <pkg> --filter=@3dbyte-tech-store/<workspace>  # Add dependency
pnpm --filter=@3dbyte-tech-store/storefront-v3 dev      # Run single app
pnpm run dev:backend                                    # Backend dev helper
pnpm run dev:cms                                        # CMS dev helper
pnpm run dev:storefront                                 # Storefront dev helper
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
| Backend | Jest (`test:unit`, `test:integration:http`, `test:integration:modules`) |
| CMS | No standard automated test script is currently configured in `package.json` |
| Storefront-v3 | Jest + React Testing Library |
| E2E | Playwright is available at repo level; add or run E2E coverage when the workflow is critical and config exists |

**Meilisearch tests**: Use `client.waitForTask(task.taskUid)` before assertions.

## Git Workflow

**Conventional commits**: `feat(backend):`, `fix(storefront):`, `docs(cms):`

**Branch naming**: `feature/[app]-description`, `fix/[app]-issue`

## Worktree Management

**Crucial**: When creating a new worktree, automatically copy local untracked `.env` files from the main worktree into the new worktree when they exist. Never commit those files; keep tracked `.env.example` and template files as the canonical references.

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
