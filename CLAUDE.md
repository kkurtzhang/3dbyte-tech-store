# 3D Byte Tech Store - Global Context Engineering Rules

## PROJECT OVERVIEW

This is a full-stack e-commerce monorepo with three main applications and shared packages:

### Applications
- **Backend** (`apps/backend`): Medusa v2.12.3 - Headless commerce platform
- **CMS** (`apps/cms`): Strapi v5.15.1 - Headless content management
- **Storefront** (`apps/storefront`): Next.js 16.1.0 - Customer-facing store

### Shared Packages
- `packages/shared-config`: ESLint, TypeScript, Prettier configurations
- `packages/shared-types`: Common TypeScript definitions
- `packages/shared-ui`: Reusable React components
- `packages/shared-utils`: Utility functions

## MONOREPO AWARENESS

### Before Every Task
1. **Check workspace structure**: Understand which app/package you're working in
2. **Review dependencies**: Check package.json for workspace dependencies
3. **Read app-specific CLAUDE.md**: Each app has its own context file
4. **Check shared packages**: Look for existing utilities/components before creating new ones

### Workspace Commands
```bash
# Install dependencies for specific workspace
pnpm add <package> --filter=@3dbyte-tech-store/<workspace>

# Run commands in specific workspace
pnpm --filter=@3dbyte-tech-store/storefront dev

# Run commands across all workspaces
pnpm -r <command>
```

## CODE ORGANIZATION

### File Size Limits
- **Maximum file size**: 400 lines
- **Ideal file size**: 200-300 lines
- **When exceeding**: Split into logical modules with clear responsibilities

### Module Structure
```
app-or-package/
├── src/
│   ├── types/         # TypeScript definitions
│   ├── utils/         # Helper functions
│   ├── services/      # Business logic
│   ├── api/          # API routes/controllers
│   └── components/    # UI components (if applicable)
├── tests/
│   └── __tests__/
└── docs/
```

### Import Order
1. External packages (React, Next.js, etc.)
2. Workspace packages (@3dbyte-tech-store/*)
3. Internal absolute imports (~/*)
4. Internal relative imports (../, ./)
5. Type imports (separated)

```typescript
// External
import { useState } from 'react';
import { createClient } from '@medusajs/client';

// Workspace
import { Button } from '@3dbyte-tech-store/shared-ui';
import type { Product } from '@3dbyte-tech-store/shared-types';

// Internal
import { formatCurrency } from '~/utils/formatting';
import { ProductCard } from '../components';

// Types
import type { FC } from 'react';
```

## TESTING REQUIREMENTS

### Test Coverage
- **Unit tests**: 80%+ coverage for utilities and services
- **Integration tests**: All API endpoints and data flows
- **E2E tests**: Critical user journeys

### Test Structure
```typescript
describe('ComponentName', () => {
  describe('when condition', () => {
    it('should have expected behavior', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Testing Tools
- **Backend**: Jest with supertest
- **CMS**: Jest with Strapi test utils
- **Storefront**: Jest + React Testing Library + Playwright
- **Shared packages**: Vitest for faster runs

### Testing with Meilisearch

When testing code that interacts with Meilisearch:

**Task Processing is Asynchronous**
```typescript
// Production code does NOT wait for tasks (recommended)
const task = await index.addDocuments(documents)
// Returns immediately, task processes in background

// For tests requiring immediate consistency, wait explicitly
const task = await index.addDocuments(documents)
await client.waitForTask(task.taskUid)  // Only in tests!
```

**Key Differences (Meilisearch SDK v0.54.0)**
| Context | Use `waitForTask`? | Reason |
|---------|-------------------|--------|
| Production | ❌ No | Faster responses, async is fine |
| Integration tests | ✅ Yes | Ensure data is indexed before assertions |
| E2E tests | ✅ Yes | Wait for search to reflect changes |

**Test Example:**
```typescript
describe('Meilisearch sync', () => {
  it('should index products', async () => {
    const task = await meilisearchModule.indexData(products)

    // In tests: wait for task to complete
    await meilisearchClient.waitForTask(task.taskUid)

    // Now assert
    const results = await meilisearchClient.index('products').search('test')
    expect(results.hits).toHaveLength(5)
  })
})
```

## TYPESCRIPT STANDARDS

### Strict Mode
- All packages use strict TypeScript
- No `any` types without explicit justification
- Prefer `unknown` over `any` when type is truly unknown

### Type Definitions
```typescript
// Use interfaces for objects
interface User {
  id: string;
  email: string;
  name: string;
}

// Use types for unions, primitives, utilities
type Status = 'pending' | 'active' | 'inactive';
type UserId = string;
type Nullable<T> = T | null;

// Export shared types from shared-types package
// Import and re-use across workspaces
```

### Generic Naming
- Use descriptive names: `TProduct`, `TUser` instead of `T`, `U`
- Or context-based: `Product`, `User` with type alias

## SHARED PACKAGES

### When to Add to Shared Package
- **shared-types**: Used by 2+ apps
- **shared-ui**: UI components used by storefront and potentially admin
- **shared-utils**: Pure functions used by 2+ apps
- **shared-config**: Build/lint configs shared across all workspaces

### Creating Shared Components
```typescript
// packages/shared-ui/src/Button.tsx
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', ...props }, ref) => {
    return <button ref={ref} className={getButtonClasses(variant, size)} {...props} />;
  }
);

Button.displayName = 'Button';
```

## DOCUMENTATION

### Code Comments
- **Why over what**: Explain reasoning, not obvious code
- **Complex logic**: Add comments for non-obvious algorithms
- **TODOs**: Include ticket reference: `// TODO(TICKET-123): Implement caching`

### Component Documentation
```typescript
/**
 * ProductCard displays product information in a card layout.
 * 
 * @example
 * ```tsx
 * <ProductCard
 *   product={product}
 *   onAddToCart={handleAddToCart}
 * />
 * ```
 */
export const ProductCard: FC<ProductCardProps> = ({ product, onAddToCart }) => {
  // Implementation
};
```

### API Documentation
- Document all endpoints with JSDoc
- Include request/response types
- Document error cases

## ERROR HANDLING

### Backend/CMS
```typescript
// Use try-catch with proper error types
try {
  const result = await service.operation();
  return { data: result };
} catch (error) {
  if (error instanceof NotFoundError) {
    return { error: 'Resource not found', status: 404 };
  }
  if (error instanceof ValidationError) {
    return { error: error.message, status: 400 };
  }
  // Log unexpected errors
  logger.error('Unexpected error:', error);
  return { error: 'Internal server error', status: 500 };
}
```

### Storefront
```typescript
// Use error boundaries for React components
// Show user-friendly messages
// Log errors for debugging

const [error, setError] = useState<string | null>(null);

try {
  await operation();
} catch (err) {
  setError('Something went wrong. Please try again.');
  console.error('Operation failed:', err);
}
```

## PERFORMANCE

### Code Splitting
- Use dynamic imports for large dependencies
- Lazy load components below the fold
- Split routes in storefront

### Database Queries
- Use proper indexes
- Avoid N+1 queries
- Implement pagination for large datasets
- Use database connection pooling

### Caching Strategy
- Redis for session and frequently accessed data
- CDN for static assets
- API response caching with proper TTL

## SECURITY

### Environment Variables
- Never commit `.env` files
- Use `.env.example` templates
- Validate all env vars on startup
- Use type-safe env validation (zod/joi)

### Input Validation
- Validate all user inputs
- Sanitize data before database operations
- Use parameterized queries (prevent SQL injection)
- Validate file uploads (type, size, content)

### Authentication
- Use secure session handling
- Implement rate limiting
- Hash sensitive data (bcrypt for passwords)
- Use HTTPS in production

## BUILD & DEPLOYMENT

### Build Process
```bash
# Development
pnpm run dev          # All apps with hot reload

# Production build
pnpm run build        # Builds all workspaces
pnpm run build:turbo  # Optimized with caching
```

### Environment-Specific Configs
- Development: `.env.development`
- Staging: `.env.staging`
- Production: `.env.production`

### Deployment Checklist
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis connection verified
- [ ] CDN cache invalidated (if needed)

## BEFORE IMPLEMENTING FEATURES

1. **Read relevant CLAUDE.md files**:
   - Root CLAUDE.md (this file)
   - App-specific CLAUDE.md in the workspace you're modifying
   
2. **Check existing patterns**:
   - Look for similar features in other parts of the codebase
   - Reuse shared components and utilities
   - Follow established architectural patterns

3. **Plan the implementation**:
   - Identify which workspaces will be affected
   - Check if shared packages need updates
   - Consider cross-app implications

4. **Validate assumptions**:
   - Review API contracts between apps
   - Check database schemas
   - Verify type compatibility

## CONTEXT ENGINEERING WORKFLOW

### Using PRPs (Product Requirements Prompts)
1. Create `INITIAL.md` in the relevant app directory
2. Run `/generate-prp apps/[app]/INITIAL.md`
3. Review generated PRP in `apps/[app]/PRPs/`
4. Run `/execute-prp apps/[app]/PRPs/feature-name.md`

### Multi-App Features
For features spanning multiple apps:
1. Create INITIAL.md at root level
2. Generate comprehensive PRP covering all affected workspaces
3. Execute with awareness of cross-app dependencies
4. Update shared packages first, then dependent apps

## COMMON GOTCHAS

### Workspace Dependencies
- Always use workspace protocol: `"@3dbyte-tech-store/shared-ui": "workspace:*"`
- Run `pnpm install` after adding workspace dependencies
- Use `--filter` flag for workspace-specific commands

### Type Mismatches
- Keep shared-types as source of truth
- Import types from shared-types, not duplicating
- Use type guards for runtime validation

### Build Order
- Shared packages must build before apps
- Turbo handles this automatically
- Manual builds: build packages first, then apps

### Environment Variables
- Each app has its own .env file
- Prefix public vars: `NEXT_PUBLIC_` (storefront), etc.
- Never access storefront env vars from backend

### MCP Usage
- When use chrome-devtools MCP to take_snapshot or take_screenshot, ALWAYS set the filePath parameter as `mcp-files/chrome-devtools`

## GIT WORKFLOW

### Commit Messages
Follow conventional commits:
- `feat(storefront): add product filtering`
- `fix(backend): resolve cart calculation bug`
- `docs(cms): update content model guide`
- `refactor(shared-ui): simplify Button component`

### Branch Naming
- `feature/[app]-brief-description`
- `fix/[app]-issue-description`
- `refactor/[package]-improvement`

### Pull Requests
- Title: Clear description of changes
- Description: What, why, and how
- Link related issues
- Add screenshots for UI changes
- Ensure all checks pass

## ASKING FOR HELP

When uncertain:
1. Check app-specific CLAUDE.md
2. Look for similar implementations in codebase
3. Review shared packages for existing solutions
4. Check official documentation (Medusa, Strapi, Next.js)
5. Ask specific questions with context

Remember: This is a monorepo. Changes in shared packages affect all apps. Always consider the broader impact of your changes.