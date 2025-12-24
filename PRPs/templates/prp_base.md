# PRP: [Feature Name]

**Created**: [Date]  
**Type**: [Single-App | Multi-App | Shared Package]  
**Workspaces Affected**: [List: apps/backend, apps/storefront, packages/shared-types, etc.]  
**Confidence Score**: [X/10]

---

## Executive Summary

[2-3 sentence overview of what this feature does and why]

---

## Global Context (from /CLAUDE.md)

### Monorepo Structure
- **Package Manager**: pnpm with workspaces
- **Build System**: Turborepo
- **Apps**: backend (Medusa), cms (Strapi), storefront (Next.js)
- **Shared Packages**: shared-config, shared-types, shared-ui, shared-utils

### Key Rules
- File size limit: 400 lines max, 200-300 ideal
- Test coverage: 80%+ for utilities and services
- TypeScript strict mode: No `any` types
- Import order: External → Workspace → Internal → Types
- Commit convention: Conventional commits (feat, fix, docs, etc.)

### Cross-Workspace Development
1. Build shared packages first
2. Update dependent apps second
3. Use `--filter` for workspace-specific commands
4. Always validate after shared package changes

---

## App-Specific Context

### [For Backend Features] Backend Context (from apps/backend/CLAUDE.md)

**Framework**: Medusa v2.12.3

**Key Concepts**:
- Services for business logic (extend TransactionBaseService)
- Workflows for complex multi-step operations
- API routes split into Store (public) and Admin (protected)
- Subscribers for event handling
- Always use transactions (atomicPhase_) for data modifications

**Common Patterns**:
```typescript
// Service pattern
class CustomService extends TransactionBaseService {
  async operation() {
    return await this.atomicPhase_(async (manager) => {
      // Transaction-safe operations
    });
  }
}

// Workflow pattern
const workflow = createWorkflow("name", (input) => {
  const step1 = step1Fn(input);
  const step2 = step2Fn(step1);
  return new WorkflowResponse(step2);
});
```

**Testing**: Jest with supertest for API routes

### [For CMS Features] CMS Context (from apps/cms/CLAUDE.md)

**Framework**: Strapi v5.15.1

**Key Concepts**:
- Content Types defined in JSON schemas
- Components for reusable field groups
- Dynamic Zones for flexible content
- Lifecycle hooks for business logic
- Controllers override default behavior

**Common Patterns**:
```typescript
// Content type with relations
{
  "attributes": {
    "relation_field": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::other.other"
    }
  }
}

// Lifecycle hooks
export default {
  async afterCreate(event) {
    // Trigger webhook, index in search, etc.
  }
}
```

**Testing**: Jest with Strapi test utils

### [For Storefront Features] Storefront Context (from apps/storefront/CLAUDE.md)

**Framework**: Next.js 16.1.0 with App Router, React 19

**Key Concepts**:
- Server Components by default (no 'use client')
- Client Components only for interactivity
- Server Actions for mutations
- Static generation with revalidation
- Tailwind CSS for styling

**Common Patterns**:
```typescript
// Server Component with data fetching
export default async function Page() {
  const data = await fetchData();
  return <Component data={data} />;
}

// Server Action
'use server';
export async function action(formData: FormData) {
  // Server-side logic
  revalidatePath('/path');
}

// Client Component for interactivity
'use client';
export function Interactive() {
  const [state, setState] = useState();
  // Interactive logic
}
```

**Testing**: Jest + React Testing Library + Playwright

---

## Feature Requirements (from INITIAL.md)

[Copy all requirements from INITIAL.md here]

### Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### Non-Functional Requirements
- [ ] Performance: [Specific metric]
- [ ] Security: [Specific requirement]
- [ ] Accessibility: [Specific requirement]

---

## Referenced Examples

### From Codebase
[List similar implementations found in the codebase]
- `apps/backend/src/services/example.ts` - Similar service pattern
- `apps/storefront/components/example.tsx` - Similar UI pattern
- `packages/shared-types/src/example.ts` - Related type definitions

### From examples/ Folder
[List relevant example files]
- `examples/backend/custom-entity.ts` - Entity creation pattern
- `examples/storefront/server-action.ts` - Server action pattern

---

## Technical Design

### Database Changes
[If applicable]

#### New Tables/Entities
```sql
-- Example schema
CREATE TABLE wishlist_items (
  id VARCHAR PRIMARY KEY,
  customer_id VARCHAR REFERENCES customers(id),
  product_id VARCHAR REFERENCES products(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wishlist_customer ON wishlist_items(customer_id);
CREATE INDEX idx_wishlist_product ON wishlist_items(product_id);
```

#### Migrations Required
- [ ] Migration 1: [Description]
- [ ] Migration 2: [Description]

### API Endpoints
[If applicable]

#### Backend (Medusa)
- `GET /store/endpoint` - [Description]
  - Authentication: [Required/Optional]
  - Query params: [List]
  - Response: [Type]
  
- `POST /store/endpoint` - [Description]
  - Authentication: [Required/Optional]
  - Body: [Type]
  - Response: [Type]

#### CMS (Strapi)
- Content Type: [Name]
  - Fields: [List]
  - Relations: [List]
  - Permissions: [Public/Private]

### Component Architecture
[If applicable]

```
storefront/
└── components/
    └── feature-name/
        ├── feature-container.tsx      (Server Component)
        ├── feature-client.tsx         (Client Component)
        ├── feature-form.tsx           (Client Component)
        └── __tests__/
            └── feature.test.tsx
```

### Type Definitions
[If applicable]

Location: `packages/shared-types/src/feature-name.ts`

```typescript
export interface NewType {
  id: string;
  field1: string;
  field2: number;
  createdAt: Date;
}

export type FeatureAction = 
  | { type: 'create'; data: NewType }
  | { type: 'update'; id: string; data: Partial<NewType> }
  | { type: 'delete'; id: string };
```

---

## Implementation Plan

### Phase 1: Shared Types & Utilities

**Workspace**: `packages/shared-types`, `packages/shared-utils`

**Steps**:

1. **Create type definitions**
   - File: `packages/shared-types/src/[feature].ts`
   - Add interfaces and types
   - Export from `packages/shared-types/src/index.ts`
   - **Validation**: TypeScript compiles, types exported correctly

2. **Create utility functions** (if needed)
   - File: `packages/shared-utils/src/[feature].ts`
   - Add pure helper functions
   - Add unit tests
   - **Validation**: Tests pass, functions work as expected

3. **Build shared packages**
   ```bash
   pnpm --filter=@3dbyte-tech-store/shared-types build
   pnpm --filter=@3dbyte-tech-store/shared-utils build
   ```
   - **Validation**: Builds succeed, no errors

### Phase 2: Backend Implementation

**Workspace**: `apps/backend`

**Steps**:

1. **Create database migration** (if needed)
   - File: `apps/backend/src/migrations/[timestamp]-[name].ts`
   - Define up/down migrations
   - **Validation**: Migration runs without errors

2. **Create/extend entity**
   - File: `apps/backend/src/models/[entity].ts`
   - Define TypeORM entity
   - Add relationships
   - **Validation**: TypeScript compiles, entity recognized

3. **Create service**
   - File: `apps/backend/src/services/[service].ts`
   - Extend TransactionBaseService
   - Implement business logic with transactions
   - **Validation**: Service resolves correctly

4. **Create API routes**
   - File: `apps/backend/src/api/store/[route]/route.ts`
   - Implement GET/POST/PUT/DELETE handlers
   - Add authentication where needed
   - Add input validation (Zod)
   - **Validation**: Routes respond correctly, validation works

5. **Add tests**
   - File: `apps/backend/src/services/__tests__/[service].spec.ts`
   - File: `apps/backend/src/api/store/[route]/__tests__/route.spec.ts`
   - Test service methods
   - Test API endpoints
   - **Validation**: All tests pass, coverage > 80%

6. **Run backend**
   ```bash
   cd apps/backend
   pnpm run dev
   ```
   - **Validation**: Server starts, no errors, endpoints accessible

### Phase 3: CMS Implementation (if applicable)

**Workspace**: `apps/cms`

**Steps**:

1. **Create content type**
   - File: `apps/cms/src/api/[name]/content-types/[name]/schema.json`
   - Define fields and relations
   - **Validation**: Content type appears in admin panel

2. **Create custom controller** (if needed)
   - File: `apps/cms/src/api/[name]/controllers/[name].ts`
   - Override default methods
   - Add custom endpoints
   - **Validation**: Endpoints work as expected

3. **Add lifecycle hooks** (if needed)
   - File: `apps/cms/src/api/[name]/content-types/[name]/lifecycles.ts`
   - Implement beforeCreate, afterUpdate, etc.
   - **Validation**: Hooks execute at correct times

4. **Configure webhooks**
   - Set up webhook to storefront
   - Test webhook delivery
   - **Validation**: Webhooks trigger correctly

5. **Run CMS**
   ```bash
   cd apps/cms
   pnpm run develop
   ```
   - **Validation**: CMS starts, content type editable

### Phase 4: Shared UI Components (if applicable)

**Workspace**: `packages/shared-ui`

**Steps**:

1. **Create shared components**
   - File: `packages/shared-ui/src/[component].tsx`
   - Build reusable UI components
   - Use Tailwind CSS classes
   - Add TypeScript types
   - **Validation**: Component renders, props typed correctly

2. **Add component tests**
   - File: `packages/shared-ui/src/__tests__/[component].test.tsx`
   - Test rendering and interactions
   - **Validation**: Tests pass

3. **Build shared-ui**
   ```bash
   pnpm --filter=@3dbyte-tech-store/shared-ui build
   ```
   - **Validation**: Build succeeds

### Phase 5: Storefront Implementation

**Workspace**: `apps/storefront`

**Steps**:

1. **Create Server Actions** (for mutations)
   - File: `apps/storefront/actions/[feature].ts`
   - Mark 'use server'
   - Implement CRUD operations
   - Add error handling
   - Use revalidatePath/revalidateTag
   - **Validation**: Actions work, revalidation triggers

2. **Create Server Components** (for data display)
   - File: `apps/storefront/app/[route]/page.tsx`
   - Fetch data server-side
   - Render static content
   - Pass data to client components
   - **Validation**: SSR works, SEO metadata correct

3. **Create Client Components** (for interactivity)
   - File: `apps/storefront/components/[feature]/[component].tsx`
   - Mark 'use client'
   - Add event handlers
   - Manage local state
   - Call Server Actions
   - **Validation**: Interactions work, state updates

4. **Add API routes** (for webhooks, etc.)
   - File: `apps/storefront/app/api/[route]/route.ts`
   - Implement GET/POST handlers
   - Verify webhook secrets
   - Trigger revalidation
   - **Validation**: Routes work, webhooks received

5. **Create page routes**
   - File: `apps/storefront/app/[route]/page.tsx`
   - Implement layout
   - Add SEO metadata
   - Configure revalidation
   - **Validation**: Page accessible, SEO correct

6. **Add tests**
   - Unit tests: `apps/storefront/components/__tests__/[component].test.tsx`
   - E2E tests: `apps/storefront/e2e/[feature].spec.ts`
   - **Validation**: All tests pass

7. **Run storefront**
   ```bash
   cd apps/storefront
   pnpm run dev
   ```
   - **Validation**: App starts, feature accessible

### Phase 6: Integration & End-to-End Testing

**All Workspaces**

**Steps**:

1. **Test complete flow**
   - Start all services: `pnpm run dev`
   - Test user journey end-to-end
   - Verify data flows correctly between apps
   - **Validation**: Complete flow works without errors

2. **Run all tests**
   ```bash
   pnpm run test
   ```
   - **Validation**: All tests pass across all workspaces

3. **Type checking**
   ```bash
   pnpm run type-check
   ```
   - **Validation**: TypeScript compiles with no errors

4. **Linting**
   ```bash
   pnpm run lint
   ```
   - **Validation**: No linting errors

5. **Build all apps**
   ```bash
   pnpm run build
   ```
   - **Validation**: All builds succeed

---

## Testing Strategy

### Unit Tests
- **Location**: `__tests__` folders next to source files
- **Coverage Target**: 80%+ for business logic
- **Tools**: Jest, React Testing Library

**Test Cases**:
- [ ] Service methods work correctly
- [ ] Components render as expected
- [ ] Utility functions handle edge cases
- [ ] Form validation works
- [ ] Error handling works

### Integration Tests
- **Location**: `__tests__/integration/`
- **Tools**: Jest, supertest (backend), Strapi test utils (CMS)

**Test Cases**:
- [ ] API endpoints return correct data
- [ ] Database operations work
- [ ] CMS content operations work
- [ ] Authentication/authorization work

### E2E Tests
- **Location**: `apps/storefront/e2e/`
- **Tools**: Playwright

**Test Cases**:
- [ ] User can complete main flow
- [ ] Data persists across sessions
- [ ] Error states display correctly
- [ ] Loading states work

---

## Edge Cases & Error Handling

### Error Scenarios
1. **[Scenario 1]**
   - Cause: [What triggers it]
   - Handling: [How we handle it]
   - User impact: [What user sees]

2. **[Scenario 2]**
   - Cause: [What triggers it]
   - Handling: [How we handle it]
   - User impact: [What user sees]

### Edge Cases
1. **[Edge case 1]**
   - Scenario: [Description]
   - Handling: [How we handle it]

2. **[Edge case 2]**
   - Scenario: [Description]
   - Handling: [How we handle it]

---

## Performance Considerations

### Backend
- [ ] Use database indexes for frequently queried fields
- [ ] Implement pagination for list endpoints
- [ ] Use Redis caching where appropriate
- [ ] Optimize N+1 queries with proper relations

### CMS
- [ ] Limit populate depth to avoid performance issues
- [ ] Use field selection to fetch only needed data
- [ ] Configure CDN for media files

### Storefront
- [ ] Use Next.js Image for image optimization
- [ ] Implement proper revalidation strategy
- [ ] Use Suspense for below-fold content
- [ ] Lazy load heavy components
- [ ] Optimize bundle size

---

## Security Considerations

- [ ] Validate all user inputs
- [ ] Sanitize data before database operations
- [ ] Use proper authentication/authorization
- [ ] Protect API endpoints appropriately
- [ ] Verify webhook signatures
- [ ] Use environment variables for secrets
- [ ] Implement rate limiting (if applicable)

---

## Documentation Updates

### Files to Update
- [ ] `README.md` - Add feature description
- [ ] API documentation in `docs/api/`
- [ ] Component documentation in `docs/components/`
- [ ] Update relevant CLAUDE.md if patterns change

### New Documentation
- [ ] Feature guide in `docs/features/[feature].md`
- [ ] API endpoint documentation
- [ ] Component usage examples

---

## Success Criteria

### Functional
- [ ] All requirements from INITIAL.md met
- [ ] Feature works end-to-end
- [ ] All user journeys tested
- [ ] Error cases handled gracefully

### Technical
- [ ] All tests passing (>80% coverage)
- [ ] TypeScript compiles with no errors
- [ ] No linting errors
- [ ] All builds successful
- [ ] No console errors or warnings

### Performance
- [ ] Page load time < 3s
- [ ] API response time < 500ms
- [ ] No memory leaks
- [ ] Bundle size reasonable

### Quality
- [ ] Code reviewed (if applicable)
- [ ] Documentation complete
- [ ] Accessible (WCAG AA)
- [ ] Mobile responsive
- [ ] Cross-browser compatible

---

## Rollback Plan

If something goes wrong:

1. **Database rollback**:
   ```bash
   cd apps/backend
   pnpm run migrations:down
   ```

2. **Git revert**:
   ```bash
   git revert [commit-hash]
   ```

3. **Workspace-specific rollback**:
   - Revert changes in specific workspace
   - Rebuild shared packages if needed
   - Verify dependent apps still work

---

## Post-Implementation Tasks

- [ ] Update changelog
- [ ] Create release notes
- [ ] Notify team of new feature
- [ ] Monitor error logs for issues
- [ ] Collect user feedback
- [ ] Plan future enhancements

---

## Confidence Assessment

**Score**: [X/10]

**What we're confident about**:
- [Item 1]
- [Item 2]

**What might need clarification**:
- [Item 1]
- [Item 2]

**Additional research needed**:
- [Item 1]
- [Item 2]

---

## Notes & Assumptions

- [Note 1]
- [Note 2]
- [Assumption 1]
- [Assumption 2]