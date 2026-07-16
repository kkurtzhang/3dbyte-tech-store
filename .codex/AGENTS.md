# Codex Project Adapter

Use the repository-root `AGENTS.md` as the canonical project guidance. This
file contains Codex-only deltas.

- `.codex/config.toml` is generated from the ECC baseline plus
  `.codex/config.project.toml`; edit the project overlay, not the generated
  config.
- Project roles are `explorer`, `reviewer`, and `docs_researcher` under
  `.codex/agents/`.
- Use only MCP servers, roles, and skills exposed by the current Codex session.
- Skills stored under `.agent/.agents/skills/` are a portable library, not an
  always-loaded project catalogue.
- User-level MCP configuration may add capabilities not present in the project
  config; do not assume they exist until the current session exposes them.
- Preserve sandbox and approval settings supplied by the active runtime.
