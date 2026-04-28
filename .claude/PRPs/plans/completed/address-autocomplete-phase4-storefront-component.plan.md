# Plan: Address Autocomplete — Phase 4: Storefront Autocomplete Component

## Summary
Create an address autocomplete component that integrates into the existing checkout `address-step.tsx`. When a customer types 3+ characters into the street address field, a debounced search queries the backend API and displays matching addresses in a dropdown. Selecting an address auto-fills `address_1`, `city`, `postal_code`, and `country_code` using the existing `react-hook-form` `setValue()`.

## User Story
As an **AU/NZ customer checking out**, I want to **type a few characters and select my address from a dropdown**, so I can **complete checkout faster with no typos**.

## Problem → Solution
Plain `<Input>` fields with zero autocomplete → Type-ahead dropdown with auto-fill on selection.

## Metadata
- **Complexity**: Medium
- **Source PRD**: `.claude/PRPs/prds/address-autocomplete.prd.md`
- **PRD Phase**: Phase 4 — Storefront Autocomplete Component
- **Estimated Files**: 3 CREATE, 2 UPDATE
- **Depends on**: Phase 1 (complete)
- **Parallel with**: Phase 3

---

## UX Design

### Before
```
┌─────────────────────────────────────┐
│  Shipping Address                    │
│  ┌─────────────────────────────┐    │
│  │ Address  [123 Lab St      ] │    │
│  │ City     [               ] │    │
│  │ Postal   [               ] │    │
│  │ Country  [US             ] │    │
│  └─────────────────────────────┘    │
│  Customer types every field manually │
└─────────────────────────────────────┘
```

### After
```
┌─────────────────────────────────────┐
│  Shipping Address                    │
│  ┌─────────────────────────────┐    │
│  │ Address  [12 Main_         ] │    │
│  │ ┌─────────────────────────┐ │    │
│  │ │ 12 Main St, Sydney 2000│ │    │
│  │ │ 12 Main Rd, Melbourne  │ │    │
│  │ │ 12 Mainview Dr, Perth  │ │    │
│  │ └─────────────────────────┘ │    │
│  │ City     [auto-filled     ] │    │
│  │ Postal   [auto-filled     ] │    │
│  │ Country  [AU              ] │    │
│  └─────────────────────────────┘    │
│  Customer selects → fields populate  │
└─────────────────────────────────────┘
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Address field | Plain `<Input>` with `{...register("address_1")}` | `<AddressAutocomplete>` wrapping Input with dropdown | Replaces lines 258-270 in address-step.tsx |
| City field | Manual typing | Auto-filled on selection, still editable | Uses `setValue("city", ...)` |
| Postal code | Manual typing | Auto-filled on selection, still editable | Uses `setValue("postal_code", ...)` |
| Country code | Manual typing | Auto-filled to "au" on selection, still editable | Uses `setValue("country_code", ...)` |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `apps/storefront-v3/src/features/checkout/components/address-step.tsx` | 1-60, 226-321 | Form structure, `setValue`, `register` usage |
| P0 | `apps/storefront-v3/src/lib/hooks/use-debounce.ts` | all | Existing debounce hook to reuse |
| P0 | `apps/storefront-v3/src/components/ui/command.tsx` | all | Existing `cmdk`-based Command component (potential reuse) |
| P0 | `apps/storefront-v3/src/components/ui/input.tsx` | all | Input component styling |
| P1 | `apps/storefront-v3/src/lib/search/client.ts` | all | Search client and index constants |
| P2 | `apps/storefront-v3/src/features/checkout/components/__tests__/delivery-step.test.tsx` | 1-30 | Test patterns: mocking, RTL, userEvent |

---

## Patterns to Mirror

### COMPONENT_PATTERN
```typescript
// SOURCE: apps/storefront-v3/src/features/checkout/components/address-step.tsx:1-2,37
"use client"
import { useState, useEffect } from "react"
export function AddressStep({ defaultValues, onComplete }: AddressStepProps) {
```

### FORM_INTEGRATION_PATTERN
```typescript
// SOURCE: apps/storefront-v3/src/features/checkout/components/address-step.tsx:44-58
const {
  register,
  handleSubmit,
  formState: { errors },
  reset,
  watch,
  setValue,
} = useForm<AddressFormData>({
  resolver: zodResolver(addressSchema),
  defaultValues: { email: "", country_code: "us", ...defaultValues },
})
```

### DEBOUNCE_PATTERN
```typescript
// SOURCE: apps/storefront-v3/src/lib/hooks/use-debounce.ts:3-15
export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500)
    return () => { clearTimeout(timer) }
  }, [value, delay])
  return debouncedValue
}
```

### INPUT_STYLING
```typescript
// SOURCE: apps/storefront-v3/src/components/ui/input.tsx:12-13
"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ..."
```

### TEST_PATTERN
```typescript
// SOURCE: apps/storefront-v3/src/features/checkout/components/__tests__/delivery-step.test.tsx:1-33
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
jest.mock("lucide-react", () => ({ /* icon mocks */ }))
jest.mock("@/app/actions/checkout", () => ({ getShippingOptionsAction: jest.fn() }))
describe("DeliveryStep", () => {
  beforeEach(() => { jest.clearAllMocks() })
  // ...
})
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `apps/storefront-v3/src/lib/search/addresses.ts` | CREATE | Address search service (fetches from backend API) |
| `apps/storefront-v3/src/features/checkout/components/address-autocomplete.tsx` | CREATE | Autocomplete input component |
| `apps/storefront-v3/src/features/checkout/components/address-step.tsx` | UPDATE | Replace plain address_1 Input with AddressAutocomplete |
| `apps/storefront-v3/src/lib/search/client.ts` | UPDATE | Add `INDEX_ADDRESSES` constant (from Phase 1) |

## NOT Building
- Global search integration (autocomplete is checkout-only)
- "Use my current location" geolocation
- Address validation/blocking
- Recent addresses from localStorage (Could-have, deferred)
- Match text highlighting in dropdown (Could-have, deferred)

---

## Step-by-Step Tasks

### Task 1: Create address search service
- **ACTION**: Create `apps/storefront-v3/src/lib/search/addresses.ts`
- **IMPLEMENT**:
  ```typescript
  import type { MeilisearchAddressDocument } from "@3dbyte-tech-store/shared-types"

  const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

  export interface AddressSearchResult {
    addresses: MeilisearchAddressDocument[]
    count: number
    processingTimeMs: number
  }

  export async function searchAddresses(
    query: string,
    limit = 8,
    country?: "AU" | "NZ"
  ): Promise<AddressSearchResult> {
    if (query.length < 3) {
      return { addresses: [], count: 0, processingTimeMs: 0 }
    }
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    if (country) params.set("country", country)

    const res = await fetch(`${BACKEND_URL}/store/addresses/autocomplete?${params}`)
    if (!res.ok) {
      console.warn("Address search failed:", res.status)
      return { addresses: [], count: 0, processingTimeMs: 0 }
    }
    return res.json()
  }
  ```
- **GOTCHA**: Uses `NEXT_PUBLIC_MEDUSA_BACKEND_URL` which is already used throughout the storefront. Gracefully returns empty on failure — autocomplete is an enhancement, not critical path.
- **VALIDATE**: Types compile

### Task 2: Create AddressAutocomplete component
- **ACTION**: Create `apps/storefront-v3/src/features/checkout/components/address-autocomplete.tsx`
- **IMPLEMENT**:
  - Props: `{ onSelect: (address: MeilisearchAddressDocument) => void; defaultValue?: string; error?: string; className?: string }`
  - Internal state: `query` (string), `isOpen` (boolean), `results` (array), `isLoading` (boolean), `selectedIndex` (number for keyboard nav)
  - Use `useDebounce(query, 300)` from existing hook
  - On debounced value change (and length >= 3): call `searchAddresses()`
  - Render: `<div className="relative">` wrapping:
    - `<Input>` with `value={query}`, `onChange`, `onFocus`, `onKeyDown`
    - Dropdown `<div>` (absolute positioned below input) with results list
    - Each result item shows `full_address` formatted as: **street**, suburb STATE postcode
    - Loading state: subtle spinner inside input (right side)
    - Empty state: "No addresses found" text
  - Keyboard: Arrow up/down moves `selectedIndex`, Enter selects, Escape closes
  - On select: call `onSelect(address)`, set `query` to `address.full_address`, close dropdown
  - Click outside: close dropdown (use `useRef` + click-outside listener)
  - Styling: Match existing Input component styling. Dropdown uses `bg-popover border rounded-md shadow-md` (matches Command component styling).
- **GOTCHA**: Do NOT use the `cmdk` Command component — it's designed for command palettes, not inline form autocomplete. Build a simpler custom dropdown that integrates cleanly with react-hook-form.
- **GOTCHA**: The component must be `"use client"` since it uses hooks and event handlers.
- **VALIDATE**: Component renders, dropdown appears on typing

### Task 3: Integrate into address-step.tsx
- **ACTION**: Update `apps/storefront-v3/src/features/checkout/components/address-step.tsx`
- **IMPLEMENT**:
  1. Import: `import { AddressAutocomplete } from "./address-autocomplete"` and `import type { MeilisearchAddressDocument } from "@3dbyte-tech-store/shared-types"`
  2. Add handler function inside the component:
     ```typescript
     const handleAddressSelect = (address: MeilisearchAddressDocument) => {
       setValue("address_1", `${address.number} ${address.street}`.trim(), { shouldValidate: true })
       if (address.unit) {
         setValue("address_2", address.unit, { shouldValidate: true })
       }
       setValue("city", address.suburb, { shouldValidate: true })
       setValue("postal_code", address.postcode, { shouldValidate: true })
       setValue("country_code", address.country.toLowerCase(), { shouldValidate: true })
     }
     ```
  3. Replace lines 257-270 (the plain address_1 Input block) with:
     ```tsx
     <div className="grid gap-2">
       <Label htmlFor="address_1">Address</Label>
       <AddressAutocomplete
         onSelect={handleAddressSelect}
         defaultValue={watch("address_1")}
         error={errors.address_1?.message}
         className={cn(errors.address_1 && "border-destructive")}
       />
       {errors.address_1 && (
         <span className="text-xs text-destructive">
           {errors.address_1.message}
         </span>
       )}
     </div>
     ```
  4. Keep the hidden `<input type="hidden" {...register("address_1")} />` OR update the autocomplete to call `register` internally — the key requirement is that `react-hook-form` still validates `address_1`.
- **GOTCHA**: `setValue` with `{ shouldValidate: true }` triggers Zod validation immediately, clearing any error state on the auto-filled fields.
- **GOTCHA**: The `address_1` field must still be registered with react-hook-form for validation. The simplest approach is to keep a hidden input with `{...register("address_1")}` and update its value via `setValue` when autocomplete selects.
- **VALIDATE**: Checkout form renders, autocomplete works, form submits correctly

---

## Testing Strategy

### Unit Tests
| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| Renders input with placeholder | Default props | Input visible | No |
| Shows dropdown after typing 3+ chars | Type "12 M" | Dropdown with results | No |
| Calls onSelect when result clicked | Click on result | `onSelect` called with address doc | No |
| Auto-fills form fields on selection | Select an address | `setValue` called for address_1, city, postal_code, country_code | No |
| Hides dropdown on Escape | Press Escape | Dropdown hidden | No |
| Handles empty results | Type "zzzzz" | "No addresses found" shown | Yes |
| Handles API error gracefully | API returns 500 | No crash, empty results | Yes |
| Does not search for < 3 chars | Type "12" | No API call, no dropdown | Yes |
| Keyboard navigation works | Arrow down + Enter | Correct result selected | No |

### Edge Cases Checklist
- [ ] Empty input after clearing
- [ ] Rapid typing (debounce prevents excessive calls)
- [ ] Click outside closes dropdown
- [ ] Tab key moves to next field (closes dropdown)
- [ ] Unit/apartment address (address_2 auto-filled)
- [ ] Form submission still works after autocomplete
- [ ] Manual editing after autocomplete selection

---

## Validation Commands

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 build
```
EXPECT: Zero errors

```bash
pnpm --filter=@3dbyte-tech-store/storefront-v3 test
```
EXPECT: All tests pass

### Browser Validation
```bash
pnpm run dev:storefront
```
- [ ] Navigate to checkout
- [ ] Type "12 Main" in address field
- [ ] See dropdown with matching addresses
- [ ] Click an address → all fields auto-fill
- [ ] Submit form → works correctly
- [ ] Keyboard nav: arrow keys + enter works
- [ ] Escape closes dropdown
- [ ] Manual typing still works (no autocomplete lock-in)

---

## Acceptance Criteria
- [ ] Autocomplete component renders in checkout address step
- [ ] Debounced search fires after 300ms and 3+ characters
- [ ] Dropdown shows formatted address results
- [ ] Selecting address auto-fills: address_1, address_2 (if unit), city, postal_code, country_code
- [ ] Keyboard navigation works (arrow keys, enter, escape)
- [ ] Click outside closes dropdown
- [ ] Loading and empty states handled gracefully
- [ ] API errors don't break checkout (graceful degradation)
- [ ] Form validation still works after autocomplete
- [ ] Manual address entry still works (autocomplete is optional)
- [ ] Build passes

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| react-hook-form validation conflict with autocomplete | Medium | Medium | Use `setValue` with `shouldValidate: true`; keep hidden registered input |
| Dropdown z-index conflict with other checkout elements | Low | Low | Use high z-index (50+) matching Command component |
| Mobile keyboard covers dropdown | Medium | Medium | Position dropdown above input on small screens (future enhancement) |

## Notes
- The autocomplete is intentionally **not** a controlled combobox (like cmdk). It's a simpler pattern: a regular input with a floating results panel. This keeps integration with react-hook-form straightforward and avoids the complexity of managing two state sources.
- `shouldValidate: true` on `setValue` is critical — without it, the Zod validation won't run on auto-filled fields, and the user could submit with stale validation errors.
- The component gracefully degrades to a plain text input if the API is down, ensuring checkout is never blocked by address search failures.
