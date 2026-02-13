# MEMORY.md - Long-Term Memory

> Curated learnings, decisions, and context for 3dbyte-tech engineering team.

---

## 🤖 Team Structure

| Agent | Role | Workspace | Model |
|-------|------|-----------|-------|
| @Architect (me) | CTO / Lead | Root monorepo | opencode/minimax-m2.5-free |
| @Merchant | Medusa v2 Backend | /apps/backend | zai/glm-4.7 |
| @Curator | Strapi v5 CMS | /apps/cms | opencode/minimax-m2.1-free |
| @Pixel | Next.js 16 Storefront | /apps/storefront-v3 | zai/glm-4.7 |
| @Sentinel | QA & Tests | Root | zai/glm-4.7|

---

## 🔧 Key Technical Decisions

### Model Stack
- **Primary**: `zai/glm-4.7` (fast, reliable for commerce logic)
- **Fallback**: `opencode/minimax-m2.5-free` (free tier, cooldown issues)
- **Important**: Use plain model names in spawn commands - fallback chain is automatic at gateway level
- **Syntax**: `GLM-2` alias also works, `#zai:fallback2` suffix is optional
- **Authority**: Architect has authority to assign fallback models to sub-agents if primary model runs low
- **Monitor next sub-agent run to verify** - Check session logs for claude CLI usage

### Sub-Agent Concurrency
- **Limit**: 2 concurrent sub-agents max
- **Config**: `~/.openclaw/openclaw.json` → `agents.defaults.subagents.maxConcurrent`
- **Enable**: Set `allowAny: true` to allow spawning any agent

### Services
| Service | Port | Status |
|---------|------|--------|
| Medusa Backend | 9000 | Stable |
| Next.js Storefront | 3001 | Unstable (crashes ~10x/day) |
| Strapi CMS | 1337 | Docker |
| Meilisearch | 7700 | 103 products |

---

## 📋 Active Sprint (Feb 10-14)

### Completed (14)
- Stripe Payment Validation
- Stripe Elements Integration
- Integration Tests (7/7 passed)
- MDX Rendering
- CMS Content & S3 Provider
- Product Compare
- Search Autocomplete
- Wishlist Page UI
- Address Book UI
- PDF Invoice
- E2E Testing Setup
- Monorepo Build
- Recently Viewed Products
- Wishlist Backend API

### In Progress
- None currently (waiting for new tasks)

---

## 🧠 Key Learnings

### Heartbeat Protocol
- Architect does NOT manage services - services only run when sub-agents are coding
- Never auto-restart services - this wastes tokens and creates infinite loops
- Services managed by sub-agents when they're actively implementing code
- **MUST follow HEARTBEAT.md exactly** - don't make up steps or skip Step 5
- Step 5 is "Report" - update heartbeat-state.json every beat, post to Telegram every 4th beat
- **Only commit TASK_BOARD.md once per day (Evening Standup)** - not every heartbeat
- **Step 2: Verify IN PROGRESS** - if tasks pass verification, MUST move them to COMPLETED section
- Search Autocomplete
- Wishlist Page UI
- Address Book UI
- PDF Invoice
- E2E Testing Setup
- Monorepo Build

### In Progress
- Storefront stability (crash recovery)

---

## 🛠️ Known Issues

1. **Storefront Crashes**: Next.js :3001 crashes ~10+ times/day, needs investigation
2. **Rate Limits**: opencode provider has cooldown periods - plan tasks around this
3. **Daily Memory**: Raw logs go to `memory/YYYY-MM-DD.md`, review weekly for MEMORY updates

---

## 📞 Communication Protocol

- **Telegram**: Kurt receives heartbeat reports every 4th beat (~hourly)
- **Evening Review**: 11 PM Hobart time - code freeze, test suite run
- **Morning Standup**: 9 AM - scan TASK_BOARD.md, assign pending work

---

## 🔗 Key Files

- `TASK_BOARD.md` - Sprint backlog and status
- `HEARTBEAT.md` - Auto-drive protocol
- `AGENTS.md` - Team roster and rules
- `TOOLS.md` - Local dev notes
