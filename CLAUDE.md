# Claude Code Entry Point

`AGENTS.md` is the canonical repository instruction file. Apply it for all work
in this monorepo; this file only defines Claude-facing routing.

## Context loading

- Read the app-local `CLAUDE.md` only for apps being changed.
- Do not preload `.agent/`, `.claude/`, historical plans, or every available
  skill. Load the smallest matching skill or reference when the task triggers
  it.
- Treat package manifests, active source, environment examples, and runtime
  evidence as more authoritative than generated guidance.
- `apps/storefront-v3` is the only active storefront. Use the
  `archive/storefront-v1-final` Git tag only for explicit historical research.

## Execution

- Use an isolated worktree for substantial changes and copy ignored `.env`
  files without staging them.
- Use sub-agents only for bounded independent workstreams when the harness
  allows them.
- Use current library documentation for version-sensitive decisions.
- For live bugs, verify the failing boundary and deployed revision before
  choosing or declaring a fix.
- Run the narrow relevant checks, review the full diff, and report validation
  gaps explicitly.

Path-specific guidance:

- `apps/backend/CLAUDE.md`
- `apps/cms/CLAUDE.md`
- `apps/storefront-v3/CLAUDE.md`
