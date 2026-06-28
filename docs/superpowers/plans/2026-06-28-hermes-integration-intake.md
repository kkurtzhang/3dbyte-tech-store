# Hermes Integration Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Hermes Product Research Packet submission out of Medusa's Admin-authenticated namespace without weakening any existing intake guardrails.

**Architecture:** Add a thin integration route that owns the external POST surface and delegates to the existing intake service. Keep the Admin root route read-only, move rate and size middleware to the integration path, and update all Hermes-facing contracts.

**Tech Stack:** Medusa v2 API routes and middleware, TypeScript, Jest, Markdown native skills.

---

### Task 1: Lock The Route Contract With Failing Tests

**Files:**
- Modify: `apps/backend/src/api/admin/ai-product-drafts/__tests__/route.unit.spec.ts`
- Modify: `apps/backend/src/lib/ai-product-drafts/__tests__/contract-artifacts.unit.spec.ts`

- [ ] **Step 1: Point intake tests at the integration route**

Replace the Admin POST import with:

```ts
import { POST as intakeDraft } from "../../../integrations/hermes/product-drafts/route"
import * as adminDraftRoutes from "../route"
```

Add an assertion that `adminDraftRoutes.POST` is undefined.

- [ ] **Step 2: Update contract assertions**

Assert that middleware and Hermes documentation contain:

```text
/integrations/hermes/product-drafts
```

Also assert that the submitter skill and Admin root route no longer expose
`POST /admin/ai-product-drafts`.

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
TEST_TYPE=unit NODE_OPTIONS=--experimental-vm-modules pnpm exec jest \
  --watchman=false --runInBand --forceExit --runTestsByPath \
  src/api/admin/ai-product-drafts/__tests__/route.unit.spec.ts \
  src/lib/ai-product-drafts/__tests__/contract-artifacts.unit.spec.ts
```

Expected: FAIL because the integration route does not exist and the Hermes
artifacts still reference the Admin path.

### Task 2: Implement The Integration Route

**Files:**
- Create: `apps/backend/src/api/integrations/hermes/product-drafts/route.ts`
- Modify: `apps/backend/src/api/admin/ai-product-drafts/route.ts`
- Modify: `apps/backend/src/api/middlewares.ts`

- [ ] **Step 1: Add the dedicated POST handler**

Implement:

```ts
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!authorizeHermesProductDraftRequest(req, res)) return

  if (isHermesProductDraftPayloadTooLarge(req.body)) {
    return res.status(413).json({ error: "Product research packet is too large" })
  }

  return createDraftFromHermesPacket(req, res)
}
```

- [ ] **Step 2: Make the Admin root route GET-only**

Remove the Hermes security imports and the `POST` export from
`apps/backend/src/api/admin/ai-product-drafts/route.ts`.

- [ ] **Step 3: Move middleware matching**

Replace the Admin POST middleware entry with:

```ts
{
  matcher: "/integrations/hermes/product-drafts",
  methods: ["POST"],
  middlewares: [hermesProductDraftRateLimit, hermesProductDraftPayloadLimit],
}
```

- [ ] **Step 4: Run route tests and verify GREEN**

Run the Task 1 Jest command. Expected: route behavior passes; documentation
contract remains red until Task 3.

### Task 3: Update Hermes Native Skills

**Files:**
- Modify: `docs/hermes/native-product-onboarding-skills.md`
- Modify: `docs/hermes/skills/hermes-medusa-draft-submitter/SKILL.md`

- [ ] **Step 1: Replace the submit endpoint**

Use only:

```text
POST /integrations/hermes/product-drafts
```

- [ ] **Step 2: Clarify transport and authorization**

Document HTTPS plus the dedicated token header. Explicitly prohibit Medusa
Admin tokens, SSH credentials, and dependency on Tailscale for submission.

- [ ] **Step 3: Run focused tests**

Run the Task 1 Jest command. Expected: PASS.

### Task 4: Verify And Publish

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused AI product draft and middleware tests**

Run the route, contract, security, and middleware suites with
`--watchman=false`. Expected: all pass.

- [ ] **Step 2: Build the backend**

Run:

```bash
pnpm --filter=@3dbyte-tech-store/backend build
```

Expected: backend and Admin builds complete successfully.

- [ ] **Step 3: Run security and diff checks**

Run `pnpm audit --audit-level high`, `git diff --check`, and scan the staged
diff for secrets. Expected: no high-severity audit failure, whitespace errors,
or committed credentials.

- [ ] **Step 4: Commit and create a draft PR**

Commit with:

```text
fix(backend): expose Hermes draft integration endpoint
```

Push `fix/backend-hermes-integration-intake` and create a draft PR targeting
`staging`.
