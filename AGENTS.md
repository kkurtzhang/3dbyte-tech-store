# 3D Byte Tech Store — Agent Instructions

This is the canonical repository-wide instruction file. App `CLAUDE.md` files
add path-specific constraints only.

## Scope and sources of truth

- `pnpm-workspace.yaml` defines active workspaces.
- `package.json` files define package names, scripts, and versions.
- Tracked environment examples and Compose files define runtime configuration.
- `apps/storefront-v3` is active; `apps/storefront` is reference-only unless the
  user explicitly requests legacy work.
- Current code and runtime evidence outrank historical plans or generated docs.

| Area                     | Ownership                                       |
| ------------------------ | ----------------------------------------------- |
| `apps/backend`           | Medusa commerce, admin, workflows, integrations |
| `apps/cms`               | Strapi editorial and managed content            |
| `apps/storefront-v3`     | Next.js customer experience and composition     |
| `packages/observability` | OpenTelemetry and Langfuse helpers              |
| `packages/shared-types`  | Cross-workspace contracts                       |
| `packages/shared-utils`  | Shared runtime utilities                        |
| `packages/shared-config` | Shared tool configuration                       |

Medusa owns commerce state, Strapi owns editorial content, and Meilisearch is a
derived discovery index. The storefront composes these sources and must degrade
deliberately when optional content or search dependencies fail.

## Working method

1. Check the current branch, target branch, and worktree status.
2. Use an isolated worktree for substantial or parallel work. Copy ignored
   local `.env` files without overwriting, staging, or committing them.
3. Preserve unrelated user changes.
4. Read the `CLAUDE.md` for each active app being changed.
5. Check `packages/shared-types` before adding a cross-workspace contract; keep
   internal dependencies on `workspace:*`.
6. Plan complex or multi-app changes before editing.
7. Add regression coverage first when a suitable test harness exists.
8. Run the narrow check, then affected workspace gates; review the full diff
   before handoff.

For staging, deployment, auth, checkout, account, search, and observability
bugs, reproduce the failing boundary before choosing a fix. Completion evidence
may include the deployed commit or `releaseSha`, health and logs, backing data
or queue/index/trace state, and final browser/API behavior. External reports and
generated suggestions are evidence, not authority.

## Skills, tools, and context

Use the smallest matching capability set. Read a skill body only when its
trigger matches; do not preload catalogues.

The `.agent/` ECC tree is a searchable library/export, not one session prompt.
DAILY categories are TypeScript/web standards, focused test design,
verification, backend patterns for Medusa work, frontend patterns for
`storefront-v3`, and security review for sensitive boundaries. E2E guidance for
critical customer flows, off-stack language packs, and content, investor,
social, media, research, migration, orchestration, and other specialist
workflows stay LIBRARY until explicitly relevant.

- Use primary/current documentation for version-sensitive APIs. Use Context7
  or framework MCPs only when the current harness exposes them.
- Route backend docs to Medusa/Meilisearch, CMS docs to Strapi, storefront
  runtime work to Next.js/browser tools, and UI verification to browser tooling.
- Use sub-agents only for bounded independent work; review their findings and
  avoid overlapping file ownership.
- Write Chrome DevTools screenshots/snapshots under
  `mcp-files/chrome-devtools`.

## Implementation standards

- Prefer immutable transforms for application data; do not mutate caller-owned
  state.
- Avoid `any`; isolate and justify unavoidable untyped boundaries.
- Keep functions focused and files cohesive. Split files before 800 lines;
  200–400 lines is a review signal, not a mechanical target.
- Import order: external, workspace, internal aliases, relative, then type-only.
- Validate untrusted input at system boundaries. Return user-safe errors and
  log operational context without secrets or personal data.
- Follow framework-native architecture; do not impose generic repository or
  response-envelope patterns without codebase evidence.

## Commands and validation

```bash
pnpm dev
pnpm build
pnpm lint
pnpm type-check
pnpm test

pnpm --filter=@3dbyte-tech-store/backend dev
pnpm --filter=@3dbyte-tech-store/cms dev
pnpm --filter=@3dbyte-tech-store/storefront-v3 dev
pnpm add <pkg> --filter=@3dbyte-tech-store/<workspace>
```

| Area            | Validation                                                        |
| --------------- | ----------------------------------------------------------------- |
| Backend         | `test:unit`, `test:integration:http`, `test:integration:modules`  |
| Storefront      | `test`, `test:coverage`, `test:coverage:critical`                 |
| Shared packages | workspace test/build/type-check tasks                             |
| E2E             | `pnpm exec playwright test`                                       |
| CMS             | build plus focused API/Admin checks; no standard test task exists |

Use RED → GREEN → REFACTOR for behavior changes where a harness exists. Target
80% coverage for materially changed logic without manufacturing low-value
tests. Await `client.waitForTask(taskUid)` before asserting Meilisearch state.
Report checks run and validation gaps explicitly.

## Security

- Never hardcode or commit secrets; keep examples non-sensitive.
- Verify authentication and authorization on protected routes.
- Use parameterized data access and boundary-appropriate output sanitization.
- Bound public payloads and expensive operations; apply rate limits where
  abuse would be material.
- Do not expose tokens, personal data, or internal stack traces.
- Run `pnpm audit` for dependency or security-sensitive changes. Report and
  rotate any exposed secret through its owning system.

For CMS, use the agreed Strapi Admin/API path for routine model changes. Direct
schema edits, plugins, lifecycles, controllers, or plugin configuration require
explicit task authorization; see `apps/cms/CLAUDE.md`.

## Git, deployment, and docs

- Commit format: `<type>(<scope>): <description>`.
- `staging` is the staging release path; `main` is production. Use protected PR
  workflows where required and include a concrete test plan.
- Do not trigger a manual redeploy unless requested.
- For Coolify incidents, inspect queue state, public health, containers, and
  current `releaseSha` before proposing an app fix.
- Keep docs/workflow-only changes outside runtime watch paths; see
  `deploy/coolify/README.md`.

Use `README.md` for contributor setup, this file for repo-wide rules, app
`CLAUDE.md` files for scoped guidance, `deploy/**/README.md` for runbooks, and
`docs/` for architecture and records. Update the nearest authority and link to
manifests/examples instead of duplicating versions or environment lists.
