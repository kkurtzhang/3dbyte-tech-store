# Execute PRP

Execute a Product Requirements Prompt to implement a feature.

## Usage
- `/execute-prp PRPs/feature-name.md` - Execute root-level PRP
- `/execute-prp apps/backend/PRPs/feature-name.md` - Execute backend PRP

## Process

1. **Read PRP**: Load the complete PRP file: $ARGUMENTS

2. **Read All Context**:
   - Root CLAUDE.md
   - Relevant app-specific CLAUDE.md files
   - Referenced example files
   - Shared package documentation

3. **Create Task List**: Use TodoWrite to create detailed tasks for each step

4. **Execute Phase by Phase**:
   For each phase:
   - Set up workspace environment
   - Implement changes
   - Run validation checks
   - Fix any issues found
   - Mark phase complete

5. **Continuous Validation**:
   - Run type checking: `pnpm run type-check`
   - Run linting: `pnpm run lint`
   - Run tests: `pnpm run test`
   - Fix any failures immediately

6. **Cross-Workspace Updates**:
   - If modifying shared packages, rebuild them first
   - Update dependent apps after shared package changes
   - Verify no breaking changes across workspaces

7. **Final Verification**:
   - All tests passing
   - TypeScript compiles with no errors
   - All success criteria met
   - No console warnings or errors

## Workspace-Specific Commands

### Backend (Medusa)
```bash
cd apps/backend
pnpm run dev                    # Start dev server
pnpm run build                  # Build
pnpm run test                   # Run tests
pnpm run migrations             # Run DB migrations
```

### CMS (Strapi)
```bash
cd apps/cms
pnpm run develop                # Start dev server
pnpm run build                  # Build
pnpm run test                   # Run tests
```

### Storefront (Next.js)
```bash
cd apps/storefront
pnpm run dev                    # Start dev server
pnpm run build                  # Build
pnpm run test                   # Run tests
pnpm run lint                   # Lint
```

### Root (All workspaces)
```bash
pnpm run dev                    # All apps in parallel
pnpm run build                  # Build all
pnpm run test                   # Test all
pnpm -r run [command]           # Run in all workspaces
```

## Notes
- Follow monorepo best practices from /CLAUDE.md
- Update shared packages before dependent apps
- Always validate after each phase
- Use TodoWrite to track progress