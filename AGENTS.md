# 3D Byte Tech Store — Agent Instructions

**Version:** 1.10.0 · Monorepo

---

## Core Principles

1. **Agent-First** — Delegate to specialized agents for domain tasks
2. **MCP-First** — Always use Context7 MCP for library/API docs, code generation, setup, or config without being explicitly asked
3. **Test-Driven** — Write tests before implementation, 80%+ coverage required
4. **Security-First** — Never compromise on security; validate all inputs
5. **Immutability** — Always create new objects, never mutate existing ones
6. **Plan Before Execute** — Plan complex features before writing code

---

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

## Data Flow Architecture

```
Medusa (Products) <-> Strapi (Content) -> Meilisearch (Index) <- Storefront (Consumer)
```

**Pattern**: Storefront Composition — parallel fetching from multiple sources for resilience and performance.

---

## MCP Configuration

### App-Specific MCPs

| App | MCPs to Use |
|-----|-------------|
| **Backend** (Medusa) | `medusa`, `meilisearch`, `context7` |
| **CMS** (Strapi) | `context7` (for Strapi docs) |
| **Storefront-v3** (Next.js) | `next-devtools`, `context7` |
| **All apps** | `serena` (semantic code analysis) |

**Chrome DevTools MCP**: When using `take_snapshot` or `take_screenshot`, set `filePath` to `mcp-files/chrome-devtools`.

---

## Agent Execution

Use specialized agents, reviewer roles, or MCP tools when they are available in the current harness.

Preferred capability mapping:

| Capability | When to Use |
|------------|-------------|
| Planning | Complex features, large refactors, multi-phase work |
| Architecture review | System design and scalability decisions |
| TDD / test design | New features, bug fixes, regression coverage |
| Code review | After writing or modifying code |
| Security review | Before commits and for sensitive auth/payment/input flows |
| Build / type error resolution | When compilation, type-checking, or CI fails |
| E2E verification | Critical user flows and browser regressions |
| Documentation lookup | Library/API documentation questions |

Execution rules:

- If the harness exposes sub-agents, map the task to the closest available specialist.
- If sub-agent spawning is unavailable or requires explicit user permission, continue locally and use MCP/tools directly.
- Parallelize only independent workstreams.

## Instruction Precedence

- Follow system, developer, and runtime instructions before project instructions when they conflict.
- Use only tools, MCP servers, and agents that are actually available in the current session.
- Treat examples in this file as guidance, not proof that a specific tool or role exists.

---

## Before Every Task

1. Read app-specific `CLAUDE.md` in the workspace you're modifying
2. Check `packages/shared-types` for existing type definitions
3. Use workspace protocol for existing internal packages, for example:
   - `"@3dbyte-tech-store/shared-config": "workspace:*"`
   - `"@3dbyte-tech-store/shared-types": "workspace:*"`
   - `"@3dbyte-tech-store/shared-utils": "workspace:*"`
4. If you're modifying `packages/*`, read the root `CLAUDE.md` first because those workspaces do not have package-local `CLAUDE.md` files.

---

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

---

## Code Standards

- **Max file size**: 400 lines (ideal: 200–300); hard max 800 lines
- **No `any` types** without justification
- **Import order**: External > Workspace (`@3dbyte-tech-store/*`) > Internal (`~/`) > Relative > Types
- **Immutability (CRITICAL)**: Always create new objects, never mutate. Return new copies with changes applied.
- **File organization**: Many small files over few large ones. Organize by feature/domain, not by type. High cohesion, low coupling.
- **Error handling**: Handle errors at every level. User-friendly messages in UI; detailed context server-side. Never silently swallow errors.
- **Input validation**: Validate all user input at system boundaries. Use schema-based validation. Fail fast with clear messages. Never trust external data.

**Code quality checklist:**
- Functions small (<50 lines), files focused (<800 lines)
- No deep nesting (>4 levels)
- Proper error handling, no hardcoded values
- Readable, well-named identifiers

---

## Testing

### Per-App Tools

| App | Tools |
|-----|-------|
| Backend | Jest (`test:unit`, `test:integration:http`, `test:integration:modules`) |
| CMS | No standard automated test script is currently configured in `package.json` |
| Storefront-v3 | Jest + React Testing Library |
| E2E | Playwright is available at repo level; add or run E2E coverage when the workflow is critical and config exists |

**Meilisearch tests**: Use `client.waitForTask(task.taskUid)` before assertions.

### Requirements

**Minimum coverage target: 80%** for touched code where a test harness exists.

Test types to use when the relevant harness exists:
1. **Unit tests** — Individual functions, utilities, components
2. **Integration tests** — API endpoints, database operations
3. **E2E tests** — Critical user flows

If a workspace does not yet have the required test harness, either add it as part of substantial feature work or call out the gap explicitly in the final handoff.

### TDD Workflow (mandatory)

1. Write test first **(RED)** — test should FAIL
2. Write minimal implementation **(GREEN)** — test should PASS
3. Refactor **(IMPROVE)** — verify coverage 80%+

Troubleshoot failures: check test isolation → verify mocks → fix implementation (not tests, unless tests are wrong).

---

## Git Workflow

**Commit format**: `<type>(<scope>): <description>`
- Scopes: `backend`, `storefront`, `cms`, etc.
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`
- Examples: `feat(backend): add product sync`, `fix(storefront): cart total rounding`

**Branch naming**: `feature/[app]-description`, `fix/[app]-issue`

**PR workflow**: Analyze full commit history → draft comprehensive summary → include test plan → push with `-u` flag.

---

## Security

**Before ANY commit:**
- No hardcoded secrets (API keys, passwords, tokens)
- All user inputs validated
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitized HTML)
- CSRF protection enabled
- Authentication/authorization verified
- Rate limiting on all endpoints
- Error messages don't leak sensitive data
- Never commit `.env` files — each app manages its own environment configuration via local `.env` files and tracked examples/templates

**Secret management**: NEVER hardcode secrets. Use environment variables or a secret manager. Validate required secrets at startup. Rotate any exposed secrets immediately.

**If a security issue is found**: STOP → use the closest available security review capability → fix CRITICAL issues → rotate exposed secrets → review codebase for similar issues.

---

## Worktree Management

**Crucial**: When creating a new worktree, automatically copy local untracked `.env` files from the main worktree into the new worktree when they exist. Never commit those files; keep tracked `.env.example` and template files as the canonical references.

---

## Development Workflow

1. **Plan** — Use the closest available planning capability; identify dependencies and risks; break work into phases
2. **TDD** — Use the closest available test-design or review capability; write tests first; implement; refactor
3. **Review** — Run a code review immediately after changes; address CRITICAL/HIGH issues
4. **Capture knowledge in the right place**
   - Personal debugging notes, preferences, temporary context → auto memory
   - Team/project knowledge (architecture decisions, API changes, runbooks) → project's existing docs structure
   - If the current task already produces the relevant docs or code comments, do not duplicate the same information elsewhere
   - If there is no obvious project doc location, ask before creating a new top-level file
5. **Commit** — Conventional commits format; comprehensive PR summaries

---

## Architecture Patterns

**API response format**: Consistent envelope with success indicator, data payload, error message, and pagination metadata.

**Repository pattern**: Encapsulate data access behind standard interface (`findAll`, `findById`, `create`, `update`, `delete`). Business logic depends on abstract interface, not storage mechanism.

**Skeleton projects**: Search for battle-tested templates, evaluate with the available review/security/tooling stack, clone the best match, and iterate within a proven structure.

---

## Performance

**Context management**: Avoid last 20% of context window for large refactoring and multi-file features. Lower-sensitivity tasks (single edits, docs, simple fixes) tolerate higher utilization.

**Build troubleshooting**: Use the closest available build/debug capability → analyze errors → fix incrementally → verify after each fix.

---

## Success Metrics

- All tests pass with 80%+ coverage
- No security vulnerabilities
- Code is readable and maintainable
- Performance is acceptable
- User requirements are met
