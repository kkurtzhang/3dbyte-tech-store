# Plan: Address Autocomplete — Phase 3: Backend API Route

## Summary
Create a Medusa store API endpoint at `/store/addresses/autocomplete` that proxies search queries to the Meilisearch `addresses` index, with input validation, rate limiting considerations, and structured response format.

## User Story
As a **storefront developer**, I want **a backend API endpoint for address search**, so that **the autocomplete component can fetch address suggestions without exposing Meilisearch credentials directly**.

## Problem → Solution
No API endpoint exists for address search → Create `GET /store/addresses/autocomplete?q=` that queries Meilisearch and returns formatted results.

## Metadata
- **Complexity**: Small
- **Source PRD**: `.claude/PRPs/prds/address-autocomplete.prd.md`
- **PRD Phase**: Phase 3 — Backend API Route
- **Estimated Files**: 3 CREATE, 1 UPDATE
- **Depends on**: Phase 1 (complete)
- **Parallel with**: Phase 4

---

## UX Design
N/A — Backend API only.

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `apps/backend/src/api/store/reviews/route.ts` | all | Store GET route pattern with query params and error handling |
| P0 | `apps/backend/src/api/store/search/validators.ts` | all | Zod validator pattern for store routes |
| P0 | `apps/backend/src/api/store/search/middlewares.ts` | all | Middleware registration pattern |
| P1 | `apps/backend/src/api/middlewares.ts` | 27-160 | How route middlewares are registered globally |
| P1 | `apps/backend/src/modules/meilisearch/service.ts` | 223-254 | `search()` method |

---

## Patterns to Mirror

### STORE_ROUTE_PATTERN
```typescript
// SOURCE: apps/backend/src/api/store/reviews/route.ts:12-46
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reviewsModule = req.scope.resolve<any>("reviewsModuleService");
  const { product_id, limit = 10, offset = 0 } = req.query;
  if (!product_id) {
    return res.status(400).json({ message: "product_id is required" });
  }
  try {
    // ... business logic
    res.json({ reviews, count: reviews.length });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch reviews",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
```

### VALIDATOR_PATTERN
```typescript
// SOURCE: apps/backend/src/api/store/search/validators.ts:4-23
export const StoreSearchProductsParams = createFindParams({
  offset: 0, limit: 50
}).merge(
  z.object({
    q: z.string().optional(),
    currency_code: z.string(),
  })
);
export type StoreSearchProductsParamsType = z.infer<typeof StoreSearchProductsParams>;
```

### MIDDLEWARE_PATTERN
```typescript
// SOURCE: apps/backend/src/api/store/search/middlewares.ts:1-12
import { MiddlewareRoute } from '@medusajs/framework';
import { validateAndTransformQuery } from '@medusajs/framework';
export const storeSearchRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/search',
    middlewares: [validateAndTransformQuery(StoreSearchProductsParams, listProductQueryConfig)]
  }
];
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `apps/backend/src/api/store/addresses/autocomplete/route.ts` | CREATE | The API endpoint |
| `apps/backend/src/api/store/addresses/autocomplete/validators.ts` | CREATE | Zod schema for query params |
| `apps/backend/src/api/store/addresses/autocomplete/middlewares.ts` | CREATE | Middleware config for validation |
| `apps/backend/src/api/middlewares.ts` | UPDATE | Import and spread address middlewares |

## NOT Building
- POST/PUT/DELETE routes (addresses are read-only from pipeline)
- Authentication (address search is public, like product search)
- Caching layer (Meilisearch is fast enough at <50ms)
- Pagination (autocomplete returns max 8 results)

---

## Step-by-Step Tasks

### Task 1: Create validators
- **ACTION**: Create `apps/backend/src/api/store/addresses/autocomplete/validators.ts`
- **IMPLEMENT**:
  ```typescript
  import { z } from "@medusajs/framework/zod";

  export const StoreAddressAutocompleteParams = z.object({
    q: z.string().min(3, "Query must be at least 3 characters"),
    limit: z.coerce.number().min(1).max(10).default(8),
    country: z.enum(["AU", "NZ"]).optional(),
  });

  export type StoreAddressAutocompleteParamsType = z.infer<typeof StoreAddressAutocompleteParams>;
  ```
- **MIRROR**: `VALIDATOR_PATTERN`
- **GOTCHA**: Use `z.coerce.number()` for query string numbers (they arrive as strings). Min 3 chars prevents overly broad searches on 15M docs.
- **VALIDATE**: Types compile

### Task 2: Create middlewares
- **ACTION**: Create `apps/backend/src/api/store/addresses/autocomplete/middlewares.ts`
- **IMPLEMENT**:
  ```typescript
  import { MiddlewareRoute } from "@medusajs/framework";
  import { validateAndTransformQuery } from "@medusajs/framework";
  import { StoreAddressAutocompleteParams } from "./validators";

  export const storeAddressAutocompleteMiddlewares: MiddlewareRoute[] = [
    {
      method: ["GET"],
      matcher: "/store/addresses/autocomplete",
      middlewares: [
        validateAndTransformQuery(StoreAddressAutocompleteParams, {
          isList: false,
        }),
      ],
    },
  ];
  ```
- **MIRROR**: `MIDDLEWARE_PATTERN`
- **VALIDATE**: File compiles

### Task 3: Create route handler
- **ACTION**: Create `apps/backend/src/api/store/addresses/autocomplete/route.ts`
- **IMPLEMENT**:
  ```typescript
  import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
  import type { StoreAddressAutocompleteParamsType } from "./validators";
  import type MeilisearchModuleService from "../../../../modules/meilisearch/service";

  export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const meilisearchService = req.scope.resolve<MeilisearchModuleService>("meilisearchModuleService");
    const { q, limit, country } = req.validatedQuery as StoreAddressAutocompleteParamsType;

    try {
      const filter: string[] = [];
      if (country) {
        filter.push(`country = "${country}"`);
      }

      const results = await meilisearchService.search(q, "address", {
        limit,
        filter: filter.length > 0 ? filter : undefined,
      });

      res.json({
        addresses: results.hits,
        count: results.estimatedTotalHits,
        processingTimeMs: results.processingTimeMs,
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to search addresses",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  ```
- **MIRROR**: `STORE_ROUTE_PATTERN`
- **GOTCHA**: The service is resolved as `"meilisearchModuleService"` (Medusa auto-generates this from the module name + "ModuleService"). Verify this at runtime.
- **VALIDATE**: Build passes

### Task 4: Register middlewares
- **ACTION**: Update `apps/backend/src/api/middlewares.ts`
- **IMPLEMENT**: Import and spread `storeAddressAutocompleteMiddlewares` alongside the existing search middlewares:
  ```typescript
  import { storeAddressAutocompleteMiddlewares } from "./store/addresses/autocomplete/middlewares";
  // In the routes array:
  ...storeSearchRoutesMiddlewares,
  ...storeAddressAutocompleteMiddlewares,
  ```
- **MIRROR**: Line 138 pattern: `...storeSearchRoutesMiddlewares,`
- **VALIDATE**: Build passes, middleware registered

---

## Testing Strategy

### Unit Tests
| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| Returns addresses for valid query | `?q=12 Main&limit=5` | JSON with `addresses` array | No |
| Returns 400 for short query | `?q=12` | 400 with validation error | Yes |
| Returns empty for no matches | `?q=zzzzzznotreal` | `{ addresses: [], count: 0 }` | Yes |
| Filters by country | `?q=12 Main&country=AU` | Only AU results | No |
| Returns 500 on Meilisearch failure | Service throws | 500 with error message | Yes |

---

## Validation Commands

```bash
pnpm --filter=@3dbyte-tech-store/backend build
```
EXPECT: Zero errors

### Manual Validation
- [ ] Start backend: `pnpm run dev:backend`
- [ ] `curl "http://localhost:9000/store/addresses/autocomplete?q=12+Main"` returns results
- [ ] `curl "http://localhost:9000/store/addresses/autocomplete?q=ab"` returns 400
- [ ] Response time < 50ms (check `processingTimeMs` in response)

---

## Acceptance Criteria
- [ ] `GET /store/addresses/autocomplete?q=` endpoint works
- [ ] Query validation enforces min 3 chars
- [ ] Country filter works
- [ ] Response includes `addresses`, `count`, `processingTimeMs`
- [ ] Error handling returns 400/500 appropriately
- [ ] Middleware registered in global middlewares.ts
- [ ] Build passes

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Module service name mismatch | Medium | Low | Verify at runtime; Medusa docs confirm convention |
| No rate limiting on public endpoint | Medium | Medium | Address in Phase 5 or via Medusa middleware |
