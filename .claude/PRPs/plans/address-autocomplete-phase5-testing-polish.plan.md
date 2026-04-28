# Plan: Address Autocomplete — Phase 5: Testing & Polish

## Summary
Write comprehensive tests for all address autocomplete components across backend and storefront, validate the E2E checkout flow, tune performance, and ensure 80%+ coverage on touched code.

## User Story
As a **developer**, I want **comprehensive test coverage for the address autocomplete feature**, so that **regressions are caught early and the feature is production-ready**.

## Problem → Solution
New feature with zero test coverage → Unit tests, integration tests, and E2E validation achieving 80%+ coverage.

## Metadata
- **Complexity**: Medium
- **Source PRD**: `.claude/PRPs/prds/address-autocomplete.prd.md`
- **PRD Phase**: Phase 5 — Testing & Polish
- **Estimated Files**: 5 CREATE
- **Depends on**: Phase 3 (complete), Phase 4 (complete)

---

## UX Design
N/A — Testing phase.

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `apps/backend/src/modules/meilisearch/utils/__tests__/product.unit.spec.ts` | all | Backend unit test pattern: factory functions, Jest assertions |
| P0 | `apps/storefront-v3/src/features/checkout/components/__tests__/delivery-step.test.tsx` | all | Storefront component test pattern: RTL, userEvent, jest.mock |
| P0 | `apps/storefront-v3/src/app/api/content-search/__tests__/route.test.ts` | all | API route test pattern: mock modules, createRequest helper |
| P1 | `apps/storefront-v3/src/lib/search/__tests__/products.test.ts` | 1-50 | Search service test pattern |

---

## Patterns to Mirror

### BACKEND_UNIT_TEST
```typescript
// SOURCE: apps/backend/src/modules/meilisearch/utils/__tests__/product.unit.spec.ts:1-14,56-100
import { toMeilisearchDocument } from "../product";
function createProduct(overrides = {}) {
  return { id: "prod_1", title: "Test", ...overrides };
}
describe("toMeilisearchDocument", () => {
  it("marks bundle products with bundle metadata", () => {
    const doc = toMeilisearchDocument(createProduct({ bundle: {...} }), regions);
    expect(doc.is_bundle).toBe(true);
  });
});
```

### STOREFRONT_COMPONENT_TEST
```typescript
// SOURCE: apps/storefront-v3/src/features/checkout/components/__tests__/delivery-step.test.tsx:1-58
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
jest.mock("@/app/actions/checkout", () => ({ getShippingOptionsAction: jest.fn() }))
describe("DeliveryStep", () => {
  beforeEach(() => { jest.clearAllMocks() })
  it("shows loading state initially", () => { /* ... */ })
  it("loads and displays options from API", async () => { /* ... */ })
})
```

### API_ROUTE_TEST
```typescript
// SOURCE: apps/storefront-v3/src/app/api/content-search/__tests__/route.test.ts:1-20
jest.mock("next/server", () => ({ NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, json: async () => body }) } }))
jest.mock("@/lib/search/content", () => ({ searchContent: jest.fn() }))
const { GET } = jest.requireActual("../route")
function createRequest(url: string) { return { nextUrl: new URL(url) } as any }
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `apps/backend/src/lib/address-pipeline/__tests__/transform.test.ts` | CREATE | Unit tests for CSV row → address document transform |
| `apps/backend/src/lib/address-pipeline/__tests__/discover.test.ts` | CREATE | Unit tests for URL discovery with mocked fetch |
| `apps/storefront-v3/src/features/checkout/components/__tests__/address-autocomplete.test.tsx` | CREATE | Component tests for autocomplete behavior |
| `apps/storefront-v3/src/lib/search/__tests__/addresses.test.ts` | CREATE | Search service tests with mocked fetch |
| `apps/storefront-v3/src/features/checkout/components/__tests__/address-step-autocomplete.test.tsx` | CREATE | Integration test: autocomplete within address form |

## NOT Building
- E2E Playwright tests (would require Meilisearch with data — defer to CI pipeline)
- Performance benchmarks (manual validation via Meilisearch dashboard)
- Load testing

---

## Step-by-Step Tasks

### Task 1: Backend transform unit tests
- **ACTION**: Create `apps/backend/src/lib/address-pipeline/__tests__/transform.test.ts`
- **IMPLEMENT**: Test the `transformRow` function from `ingest.ts`:
  ```
  Tests:
  - transforms valid CSV row to MeilisearchAddressDocument
  - composes full_address from all parts
  - handles empty UNIT field (no leading comma)
  - handles missing HASH (uses fallback ID)
  - handles empty NUMBER field
  - trims whitespace from all fields
  - sets country to "AU"
  ```
- **MIRROR**: `BACKEND_UNIT_TEST` pattern with factory function
- **VALIDATE**: `pnpm --filter=@3dbyte-tech-store/backend test:unit`

### Task 2: Backend discover unit tests
- **ACTION**: Create `apps/backend/src/lib/address-pipeline/__tests__/discover.test.ts`
- **IMPLEMENT**: Test `discoverLatestDownloadUrl` with mocked `fetch`:
  ```
  Tests:
  - returns download URL from successful API response
  - throws on empty response
  - throws on network error
  - handles malformed API response gracefully
  ```
- **GOTCHA**: Mock global `fetch` with `jest.spyOn(global, "fetch")`
- **VALIDATE**: `pnpm --filter=@3dbyte-tech-store/backend test:unit`

### Task 3: Storefront search service tests
- **ACTION**: Create `apps/storefront-v3/src/lib/search/__tests__/addresses.test.ts`
- **IMPLEMENT**: Test `searchAddresses` with mocked fetch:
  ```
  Tests:
  - returns empty for query < 3 chars (no fetch call)
  - returns parsed results for valid query
  - returns empty on API error (graceful degradation)
  - passes country filter when provided
  - respects limit parameter
  ```
- **VALIDATE**: `pnpm --filter=@3dbyte-tech-store/storefront-v3 test`

### Task 4: Autocomplete component tests
- **ACTION**: Create `apps/storefront-v3/src/features/checkout/components/__tests__/address-autocomplete.test.tsx`
- **IMPLEMENT**: Test `AddressAutocomplete` component with RTL:
  ```
  Tests:
  - renders input with correct placeholder
  - does not show dropdown initially
  - shows dropdown after typing 3+ chars (mock searchAddresses)
  - calls onSelect when result is clicked
  - closes dropdown on Escape key
  - shows "No addresses found" for empty results
  - handles loading state
  - keyboard: arrow down highlights next item
  - keyboard: Enter selects highlighted item
  - does not search for < 3 characters
  ```
- **MIRROR**: `STOREFRONT_COMPONENT_TEST` pattern
- **GOTCHA**: Mock `searchAddresses` from `@/lib/search/addresses`. Use `jest.useFakeTimers()` for debounce testing, then `jest.advanceTimersByTime(300)`.
- **VALIDATE**: `pnpm --filter=@3dbyte-tech-store/storefront-v3 test`

### Task 5: Address step integration test
- **ACTION**: Create `apps/storefront-v3/src/features/checkout/components/__tests__/address-step-autocomplete.test.tsx`
- **IMPLEMENT**: Test autocomplete integration within AddressStep:
  ```
  Tests:
  - autocomplete appears in address form
  - selecting address auto-fills city, postal_code, country_code fields
  - auto-fills address_2 when unit is present
  - form can be submitted after autocomplete selection
  - manual typing still works without autocomplete
  ```
- **GOTCHA**: Must mock both `searchAddresses` and `getAddressesAction`. The form wraps with react-hook-form, so use `waitFor` for async state updates.
- **VALIDATE**: `pnpm --filter=@3dbyte-tech-store/storefront-v3 test`

### Task 6: Performance tuning & polish
- **ACTION**: Review and tune based on test results
- **IMPLEMENT**:
  - Verify debounce timing (300ms) feels responsive
  - Verify result limit (8) provides enough options without overwhelming
  - Verify dropdown positioning doesn't conflict with other elements
  - Add `aria-` attributes to autocomplete for accessibility:
    - `role="combobox"` on input
    - `aria-expanded` on input
    - `role="listbox"` on dropdown
    - `role="option"` on each result item
    - `aria-activedescendant` for keyboard selection
- **VALIDATE**: Manual testing in browser

---

## Validation Commands

```bash
# Backend unit tests
pnpm --filter=@3dbyte-tech-store/backend test:unit
```
EXPECT: All tests pass

```bash
# Storefront tests
pnpm --filter=@3dbyte-tech-store/storefront-v3 test
```
EXPECT: All tests pass

```bash
# Full monorepo build
pnpm run build:turbo
```
EXPECT: No regressions

```bash
# Coverage check (storefront)
pnpm --filter=@3dbyte-tech-store/storefront-v3 test -- --coverage --collectCoverageFrom='src/features/checkout/components/address-autocomplete.tsx' --collectCoverageFrom='src/lib/search/addresses.ts'
```
EXPECT: 80%+ coverage on touched files

---

## Acceptance Criteria
- [ ] Backend transform function: 6+ unit tests passing
- [ ] Backend discover function: 4+ unit tests passing
- [ ] Storefront search service: 5+ unit tests passing
- [ ] Autocomplete component: 10+ unit tests passing
- [ ] Address step integration: 5+ tests passing
- [ ] 80%+ coverage on all new files
- [ ] All existing tests still pass (no regressions)
- [ ] Accessibility attributes added to autocomplete
- [ ] Full monorepo build passes

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Debounce timing makes tests flaky | Medium | Low | Use `jest.useFakeTimers()` consistently |
| react-hook-form async updates in tests | Medium | Low | Use `waitFor` and `act` wrappers |

## Notes
- Coverage target is 80% on **touched files only**, not the entire codebase.
- E2E tests with Playwright are deferred because they require a running Meilisearch instance with address data. These should be added to the CI pipeline once the data pipeline (Phase 2) has been run at least once.
- The test file naming follows the existing pattern: `__tests__/{component-name}.test.tsx` for components, `__tests__/{module-name}.test.ts` for services.
