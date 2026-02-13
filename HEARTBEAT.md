# HEARTBEAT.md

# Auto-Drive Protocol - READ THIS FIRST

When heartbeat fires, FOLLOW THIS EXACTLY:

---

## Step 1: Check Running Agents

```bash
openclaw sessions list --kinds subagent
```

**Action:** Identify stuck sub-agents (>5min active without completion).

---

## Step 1b: Stuck Sub-Agent Handling

**Definition:** Sub-agent is "stuck" if active >5min without progress.

### Workflow for Stuck Sub-Agents

```
Detected stuck → Check services → Diagnose → Action
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    Services down?            Services OK             Complex issue
            │                       │                       │
            ▼                       ▼                       ▼
    Start services            Check complexity    Flag for human review
    Re-assign task           - Simple? Retry     @Mention Kurt
    (max 1 auto-retry)      - Complex? Escalate  [CRITICAL BLOCKER]
```

### Retry Limits (Prevent Infinite Loops)

| Task Type | Max Retries | Notes |
|-----------|-------------|-------|
| Code changes | 2 | Build/test failures |
| Tests | 3 | Transient flakes allowed |
| UI/Frontend | 2 | Visual/regression issues |
| API/Backend | 2 | Network/service issues |
| Config | 1 | Manual review needed |

**Rules:**
- Increment retry count on each failure
- Reset counter when task changes
- After max retries → Flag for human review
- Escalate immediately if "stuck" appears twice

---

## 🚨 Architect Authority: Investigate & Fix Blockers

When ANY blocker is detected during heartbeat, the Architect has full authority to:

1. **Investigate** - Run commands, read logs, check files
2. **Diagnose** - Identify root cause
3. **Fix** - Apply fixes directly (config changes, service restarts, etc.)
4. **Assign & Spawn** - Move BACKLOG task to IN PROGRESS and spawn sub-agent
5. **Escalate** - If unresolvable, flag with `[CRITICAL BLOCKER]`

**Key Principle:** Fix blockers AND keep the pipeline moving — always assign new work when fixing issues.

**Blocker Types & Actions:**
| Blocker | Action |
|---------|--------|
| Service down | Start service |
| Config error | Fix config file |
| Missing deps | Install dependencies |
| Wrong workdir | Update spawn command |
| Sub-agent suspicious | Investigate logs, retry |
| Unknown | Document & escalate |

---

## Step 2: Verify IN PROGRESS Tasks

For each task in "IN PROGRESS":

| Task Type | Verification Command |
|-----------|---------------------|
| Code changes | `pnpm build` |
| Tests | `pnpm test` |
| UI/Frontend | `playwright-cli open <url> --headed` |
| API/Backend | `curl <url>` returns 200 |
| Full stack | Build + Visual verification |

**Rules:**
- **Sub-agents self-verify** before marking complete
- Spot-check only (don't re-verify everything)
- If work looks good → leave as "COMPLETED (verified & closed)"
- If suspicious → mark back to "IN PROGRESS" with note

---

## Step 3: Update TASK_BOARD.md & Assign Tasks

**Rule:** Always keep the pipeline moving — when fixing blockers, also assign new work.

### 3a: Move Tasks from BACKLOG to IN PROGRESS
For each task in BACK-LOG:
 Priority order: High → Medium → Low
- Move top pending task to "IN PROGRESS"
- Assign to appropriate agent (@Merchant, @Pixel, @Curator)

### 3b: Update IN PROGRESS Tasks
Document:
- Timestamp
- Evidence (build output, curl, screenshot)
- Pass/fail status

### 3c: Fix Blockers & Assign Simultaneously
When investigating issues:
1. Run diagnosis commands
2. Apply fixes
3. **Also spawn sub-agent for next BACKLOG task**
→ Keeps work flowing even while debugging

---

## Step 4: Assign Tasks & Spawn Sub-Agents

**Sub-agents are now enabled!** (`allowAny: true`)

**Concurrency Limit:** Maximum **2 sub-agents** running simultaneously.

**Root Project:** `/Users/3dbyte-tech/claw_ws/3dbyte-tech-store`

| Agent | Workdir |
|-------|---------|
| @Merchant | `$ROOT/apps/backend` |
| @Curator | `$ROOT/apps/cms` |
| @Pixel | `$ROOT/apps/storefront-v3` |

For each task in "IN PROGRESS":

1. If task has NO owner or needs rework:
   - Identify owner (@Merchant, @Pixel, @Curator)
   - Check retry count (see limits below)
   - Spawn sub-agent with correct workdir:

```bash
openclaw sessions spawn --agentId <name> --workdir /Users/3dbyte-tech/claw_ws/3dbyte-tech-store/apps/<path> --task "<task details>" --label "<label>"
```

**Examples:**
```bash
# Backend task
openclaw sessions spawn --agentId merchant --workdir /Users/3dbyte-tech/claw_ws/3dbyte-tech-store/apps/backend --task "Configure Stripe..." --label "stripe-config"

# Storefront task
openclaw sessions spawn --agentId pixel --workdir /Users/3dbyte-tech/claw_ws/3dbyte-tech-store/apps/storefront-v3 --task "Add checkout UI..." --label "checkout-ui"

# CMS task
openclaw sessions spawn --agentId curator --workdir /Users/3dbyte-tech/claw_ws/3dbyte-tech-store/apps/cms --task "Create content types..." --label "cms-content"
```

2. Sub-agent workflow:
   - Start local dev servers if needed
   - Complete the work using `claude` CLI for precision edits
   - **Self-verify** before marking complete
   - **Shut down servers after job done**
   - Move task to "COMPLETED (verified & closed)"

3. Track sub-agents:
```bash
openclaw sessions list --kinds subagent
```

---

## Step 4b: Project Investigation (Low Backlog)

When BACKLOG has **fewer than 3 tasks**, Architect MUST investigate the project to find new work:

### Investigation Methods

1. **Browse Storefront** (playwright-cli):
```bash
playwright-cli open http://localhost:3001 --headed
```
- Look for missing pages, broken links, or incomplete features
- Check checkout flow, product pages, blog rendering

2. **Code Investigation**:
- Scan `apps/backend` for unimplemented features
- Check `apps/storefront-v3` for missing components
- Review `apps/cms` for content gaps

3. **Git Exploration**:
```bash
git log --oneline -20
git diff main...HEAD
```
- Find recent changes that need follow-up
- Check for abandoned branches

### Add New Tasks
Create tasks in BACKLOG with priority:
- **High**: Core commerce features missing
- **Medium**: UI polish, content gaps
- **Low**: Nice-to-have improvements

---

## Step 5: Report (Log to Memory)

Update heartbeat-state.json with:
- beatCount
- activeSubagents
- completedTasks
- backlogCount

**Rules:**
- Update heartbeat-state.json every heartbeat
- Commit changes to git **once per day (Evening Standup)**

---

## Health Checks

- `pnpm test` in root → Alert if fails
