# PRP: Add Meilisearch Sync Page to Admin Dashboard

**Date**: 2025-01-25
**Feature**: Meilisearch Admin Sync Page
**Workspace**: Backend (apps/backend)
**Confidence Score**: 9/10

---

## Executive Summary

Add a new page to the Medusa Admin Dashboard that allows administrators to manually trigger a full re-index of all products to Meilisearch. The page will be accessible under Settings → Meilisearch and will provide a simple interface with a sync button and status feedback.

**Existing Infrastructure** (Already implemented):
- API Route: `src/api/admin/meilisearch/sync-products/route.ts` - POST endpoint that triggers the sync workflow
- Workflow: `src/workflows/meilisearch/sync-all-products-to-meilisearch.ts` - Orchestrates the full sync process
- SDK Setup: `src/admin/lib/sdk.ts` - JS SDK configured for admin API calls
- Shared Components: `src/admin/components/` - Reusable Header, Container components

**What's Needed**:
- Create a UI route (React page) that displays a button to trigger the sync
- Show loading state during sync
- Display success/error toast notifications
- Add the page to Settings menu

---

## Table of Contents
1. [Documentation References](#documentation-references)
2. [Codebase Context](#codebase-context)
3. [Technical Approach](#technical-approach)
4. [Implementation Tasks](#implementation-tasks)
5. [Validation Gates](#validation-gates)

---

## Documentation References

### Official Medusa Documentation
- **[Admin UI Routes](https://docs.medusajs.com/learn/fundamentals/admin/ui-routes)** - Complete guide on creating custom admin pages
- **[Meilisearch Integration Guide](https://docs.medusajs.com/resources/integrations/guides/meilisearch#add-meilisearch-sync-page-to-admin-dashboard)** - Specific example for Meilisearch sync page
- **[Medusa UI Components](https://docs.medusajs.com/ui)** - Component library reference

### Key Pattern from Official Docs:
The Medusa documentation shows the exact pattern for creating a sync page:

```typescript
// src/admin/routes/settings/meilisearch/page.tsx
import { Container, Heading, Button, toast } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"
import { defineRouteConfig } from "@medusajs/admin-sdk"

const MeilisearchPage = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: () => sdk.client.fetch("/admin/meilisearch/sync", {
      method: "POST",
    }),
    onSuccess: () => {
      toast.success("Successfully triggered data sync to Meilisearch")
    },
    onError: (err) => {
      console.error(err)
      toast.error("Failed to sync data to Meilisearch")
    },
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Meilisearch Sync</Heading>
      </div>
      <div className="px-6 py-8">
        <Button
          variant="primary"
          onClick={() => mutate()}
          isLoading={isPending}
        >
          Sync Data to Meilisearch
        </Button>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Meilisearch",
})

export default MeilisearchPage
```

### Additional Resources
- **[Building Custom Admin Pages](https://medium.com/@igorkhomenko/building-a-multivendor-marketplace-with-medusa-js-2-0-a-dev-guide-f55aec971126)** - Developer guide with examples
- **[Admin UI Routes Discussion](https://github.com/medusajs/medusa/discussions/6324)** - Community discussion on custom admin UI

---

## Codebase Context

### Files Already Created (Use These!)

#### 1. API Route - Already Implemented
**File**: `src/api/admin/meilisearch/sync-products/route.ts`

This file already has:
- `POST /admin/meilisearch/sync-products` - Triggers the workflow
- `GET /admin/meilisearch/sync-products` - Returns endpoint info

Response format:
```json
{
  "message": "Products synced to Meilisearch successfully",
  "total": 150,
  "indexed": 150
}
```

#### 2. Workflow - Already Implemented
**File**: `src/workflows/meilisearch/sync-all-products-to-meilisearch.ts`

This workflow:
- Fetches all products from Medusa using `useQueryGraphStep`
- Fetches enriched content from Strapi
- Indexes products to Meilisearch

#### 3. SDK Configuration - Already Set Up
**File**: `src/admin/lib/sdk.ts`

```typescript
import Medusa from "@medusajs/js-sdk";

export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "jwt",
  },
});
```

**Note**: The SDK uses `type: "jwt"` for authentication. This is correct for the admin.

### Files to Reference for Patterns

#### 4. Example Admin Page - Brands Page
**File**: `src/admin/routes/brands/page.tsx`

Key patterns from this file:
- Uses `defineRouteConfig` for route configuration
- Uses shared `Container` and `Header` components
- Uses `toast` for notifications
- Uses hooks from `@medusajs/ui`

#### 5. Shared Components
**File**: `src/admin/components/header.tsx` - Header component with title, subtitle, actions
**File**: `src/admin/components/container.tsx` - Wrapper for UI Container

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin Dashboard - Settings → Meilisearch                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  UI Route: src/admin/routes/settings/meilisearch/page.tsx      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ - Display sync button with loading state                 │   │
│  │ - Use useMutation hook for API call                     │   │
│  │ - Show success/error toast notifications                │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  JS SDK (sdk.client.fetch)                                      │
│  POST /admin/meilisearch/sync-products                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  API Route: src/api/admin/meilisearch/sync-products/route.ts   │
│  - Calls syncAllProductsToMeilisearchWorkflow                  │
│  - Returns { message, total, indexed }                         │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Pseudocode

```typescript
// src/admin/routes/settings/meilisearch/page.tsx

import { Container, Heading, Button, toast, Text } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Header } from "../../../components/header"
import { Search } from "@medusajs/icons" // or appropriate icon

type SyncResponse = {
  message: string
  total: number
  indexed: number
}

const MeilisearchPage = () => {
  // Mutation hook
  const { mutate, isPending } = useMutation({
    mutationFn: async (): Promise<SyncResponse> => {
      const response = await sdk.client.fetch<SyncResponse>(
        "/admin/meilisearch/sync-products",
        { method: "POST" }
      )
      return response
    },
    onSuccess: (data) => {
      toast.success("Meilisearch sync completed", {
        description: `Successfully indexed ${data.indexed} out of ${data.total} products`
      })
    },
    onError: (err) => {
      console.error(err)
      toast.error("Failed to sync products to Meilisearch", {
        description: err instanceof Error ? err.message : "Unknown error"
      })
    },
  })

  const handleSync = () => {
    mutate()
  }

  return (
    <Container>
      <Header
        title="Meilisearch"
        subtitle="Manually trigger a full re-index of all products to Meilisearch."
      />
      <div className="px-6 py-8">
        <div className="flex flex-col gap-y-4">
          <Text>
            Clicking the button below will sync all products from Medusa to Meilisearch,
            including enriched content from Strapi (if available).
          </Text>
          <Button
            variant="primary"
            onClick={handleSync}
            isLoading={isPending}
            disabled={isPending}
          >
            {isPending ? "Syncing..." : "Sync Products to Meilisearch"}
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Meilisearch",
})

export default MeilisearchPage
```

---

## Implementation Tasks

### Task 1: Create the Meilisearch Settings Page
**File**: `apps/backend/src/admin/routes/settings/meilisearch/page.tsx`

1. Import necessary components:
   - `Container`, `Heading`, `Button`, `toast`, `Text` from `@medusajs/ui`
   - `useMutation` from `@tanstack/react-query`
   - `defineRouteConfig` from `@medusajs/admin-sdk`
   - `sdk` from `../../../lib/sdk`
   - Shared `Header` component from `../../../components/header`

2. Create the page component:
   - Use `useMutation` hook with `sdk.client.fetch()` to call `/admin/meilisearch/sync-products`
   - Handle loading state with `isLoading` prop on Button
   - Show success toast with indexed count
   - Show error toast with error message

3. Configure the route:
   - Export `config` object with `defineRouteConfig`
   - Set `label: "Meilisearch"` for the sidebar

### Task 2: Test the Implementation

1. Start the dev server:
   ```bash
   cd apps/backend
   pnpm run dev
   ```

2. Navigate to the admin dashboard at `http://localhost:9000/app`

3. Go to Settings → Meilisearch

4. Click the "Sync Products to Meilisearch" button

5. Verify:
   - Button shows loading state during sync
   - Success toast appears with indexed count
   - Products are actually indexed in Meilisearch

---

## Validation Gates

### 1. Type Check
```bash
cd apps/backend
pnpm run type-check
```

Expected: No TypeScript errors

### 2. Build Check
```bash
cd apps/backend
pnpm run build
```

Expected: Build completes successfully

### 3. Dev Server Check
```bash
cd apps/backend
pnpm run dev
```

Expected: Server starts without errors

### 4. Manual UI Testing
1. Login to admin dashboard at `http://localhost:9000/app`
2. Navigate to Settings → Meilisearch
3. Verify page loads with title "Meilisearch"
4. Click "Sync Products to Meilisearch" button
5. Verify button shows "Syncing..." and is disabled
6. Verify success toast appears with message like "Successfully indexed X out of Y products"

---

## Important Notes & Gotchas

### 1. SDK Authentication Type
The existing SDK config uses `type: "jwt"` for authentication. This is correct for admin customizations.

### 2. File Location for Settings Pages
To add a page under Settings, create the file at:
```
src/admin/routes/settings/meilisearch/page.tsx
```

The path `settings/meilisearch` determines where it appears in the admin menu.

### 3. Arrow Function Requirement
UI route components **must** be created as arrow functions, not regular function declarations.

❌ **Wrong**:
```typescript
function MeilisearchPage() {
  return <div>...</div>
}
```

✅ **Correct**:
```typescript
const MeilisearchPage = () => {
  return <div>...</div>
}
```

### 4. Required Exports
Every UI route must export:
1. The React component (as `default`)
2. A `config` object from `defineRouteConfig`

### 5. API Response Type
The API route returns:
```json
{
  "message": "string",
  "total": "number",
  "indexed": "number"
}
```

Use this type in the `useMutation` for proper type safety.

### 6. Toast Notifications
Always provide user feedback:
- **Success**: Show what was accomplished (e.g., "Successfully indexed 150 products")
- **Error**: Show actionable error message

---

## Files to Create/Modify

### Create (1 file)
1. `apps/backend/src/admin/routes/settings/meilisearch/page.tsx`

### Reference Only (No Changes Needed)
- `src/api/admin/meilisearch/sync-products/route.ts` - Already implemented
- `src/workflows/meilisearch/sync-all-products-to-meilisearch.ts` - Already implemented
- `src/admin/lib/sdk.ts` - Already configured
- `src/admin/components/header.tsx` - Reusable component
- `src/admin/components/container.tsx` - Reusable component

---

## Success Criteria

1. ✅ New page appears under Settings → Meilisearch in admin dashboard
2. ✅ Page displays with title "Meilisearch" and description
3. ✅ "Sync Products to Meilisearch" button is visible and clickable
4. ✅ Clicking button triggers API call to `/admin/meilisearch/sync-products`
5. ✅ Button shows loading state during sync
6. ✅ Success toast appears with indexed product count
7. ✅ Error toast appears if sync fails
8. ✅ No TypeScript errors
9. ✅ Build completes successfully
10. ✅ Products are actually indexed in Meilisearch

---

## Confidence Score: 9/10

**Reasons for High Confidence**:
1. **Official Documentation**: Medusa provides exact code example for this use case
2. **Existing Infrastructure**: API route, workflow, and SDK are already implemented
3. **Codebase Patterns**: Multiple similar pages exist (brands, etc.) to reference
4. **Simple Scope**: Single page with one button action

**Remaining Risks**:
1. SDK authentication type (JWT) may need verification
2. Icon selection for sidebar menu (may need to import appropriate icon)

---

## Post-Implementation Documentation

After successful implementation, update:
1. `/docs/meilisearch-integration-guide.md` - Add section about admin sync page
2. Create `/docs/admin-meilisearch-sync.md` - User guide for the sync feature

---

## References

### Sources
- [Admin UI Routes - Medusa Documentation](https://docs.medusajs.com/learn/fundamentals/admin/ui-routes)
- [Meilisearch Integration - Step 4](https://docs.medusajs.com/resources/integrations/guides/meilisearch#add-meilisearch-sync-page-to-admin-dashboard)
- [Medusa UI Components](https://docs.medusajs.com/ui)
- [Building Custom Admin Pages](https://medium.com/@igorkhomenko/building-a-multivendor-marketplace-with-medusa-js-2-0-a-dev-guide-f55aec971126)
- [GitHub Discussion: Custom Admin UI Dashboard](https://github.com/medusajs/medusa/discussions/6324)

### Internal Documentation
- `/docs/meilisearch-integration-guide.md` - Full integration guide
- `/apps/backend/CLAUDE.md` - Backend-specific context
- `/apps/backend/examples/README.md` - Example patterns

---

**End of PRP**
