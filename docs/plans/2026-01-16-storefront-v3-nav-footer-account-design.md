# Storefront V3 Navigation, Footer, & Account System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (if single session) or superpowers:executing-plans (if parallel) to implement this plan task-by-task.

**Goal:** Implement a production-ready Navigation, Footer, and Hybrid Account system for `storefront-v3` matching "The Lab" design language.

**Architecture:**
- **Navigation**: Sticky header with "Command Center" search and "Quick Actions".
- **Footer**: Technical 4-column layout with consistent branding.
- **Search**: `Cmd+K` global command palette powered by Meilisearch.
- **Auth**: Hybrid model (Sheet for quick login, Pages for account management).
- **Mobile**: Responsive implementations for all components (Sheet menu for mobile nav).

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS, Shadcn UI, Meilisearch, Medusa JS Client.

---

### Task 1: Navigation Bar & Mobile Menu

**Files:**
- Create: `apps/storefront-v3/src/components/layout/navbar.tsx`
- Create: `apps/storefront-v3/src/components/layout/mobile-menu.tsx`
- Modify: `apps/storefront-v3/src/app/layout.tsx`

**Step 1: Write failing test (Component Render)**
Create `apps/storefront-v3/src/__tests__/components/layout/navbar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { Navbar } from '@/components/layout/navbar';

describe('Navbar', () => {
  it('renders logo and main links', () => {
    render(<Navbar />);
    expect(screen.getByText('3D Byte')).toBeInTheDocument();
    expect(screen.getByText('The Lab')).toBeInTheDocument();
  });
});
```

**Step 2: Run test (Expect Fail)**
Run: `pnpm --filter=@3dbyte-tech-store/storefront-v3 test`

**Step 3: Implement Navbar**
Create `apps/storefront-v3/src/components/layout/navbar.tsx` with:
- Logo + "The Lab" badge
- Desktop Links (Filaments, Printers, etc.)
- Action Array (Search, Account, Cart, Theme)
- Mobile Menu Trigger (Hamburger icon)

**Step 4: Implement Mobile Menu**
Create `apps/storefront-v3/src/components/layout/mobile-menu.tsx` using `Sheet` component.

**Step 5: Integrate into Layout**
Update `apps/storefront-v3/src/app/layout.tsx` to use the new `Navbar`.

**Step 6: Run test (Expect Pass)**

**Step 7: Commit**
`feat(storefront-v3): implement navbar and mobile menu`

---

### Task 2: Footer Implementation

**Files:**
- Create: `apps/storefront-v3/src/components/layout/footer.tsx`
- Modify: `apps/storefront-v3/src/app/layout.tsx`

**Step 1: Write failing test**
Create `apps/storefront-v3/src/__tests__/components/layout/footer.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/layout/footer';

describe('Footer', () => {
  it('renders all sections', () => {
    render(<Footer />);
    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('The Lab')).toBeInTheDocument();
  });
});
```

**Step 2: Run test (Expect Fail)**

**Step 3: Implement Footer**
Create `apps/storefront-v3/src/components/layout/footer.tsx` with 4-column grid (responsive to 1-column on mobile).

**Step 4: Integrate into Layout**
Update `apps/storefront-v3/src/app/layout.tsx` to use the new `Footer`.

**Step 5: Run test (Expect Pass)**

**Step 6: Commit**
`feat(storefront-v3): implement footer`

---

### Task 3: Command Center Search (UI Only)

**Files:**
- Create: `apps/storefront-v3/src/components/search/search-command-dialog.tsx`
- Modify: `apps/storefront-v3/src/components/layout/navbar.tsx`

**Step 1: Write failing test**
Create `apps/storefront-v3/src/__tests__/components/search/search-command.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchCommandDialog } from '@/components/search/search-command-dialog';

describe('SearchCommandDialog', () => {
  it('opens on trigger click', () => {
    const { getByTestId } = render(<SearchCommandDialog />);
    // ... test logic for open state
  });
});
```

**Step 2: Run test (Expect Fail)**

**Step 3: Implement Search Dialog**
Use `cmdk` via shadcn `Command` component.
- Implement grouping logic (Products, Collections, Brands).
- Add `useEffect` for `Cmd+K` shortcut.

**Step 4: Connect to Navbar**
Update `Navbar` to include the `SearchCommandDialog` and trigger it.

**Step 5: Run test (Expect Pass)**

**Step 6: Commit**
`feat(storefront-v3): implement command center search ui`

---

### Task 4: Hybrid Auth System - Part 1 (Quick-Auth Sheet)

**Files:**
- Create: `apps/storefront-v3/src/features/auth/components/auth-sheet.tsx`
- Create: `apps/storefront-v3/src/features/auth/components/login-form.tsx`
- Create: `apps/storefront-v3/src/features/auth/components/register-form.tsx`

**Step 1: Write failing test**

**Step 2: Implement Forms**
Create Login and Register forms using `react-hook-form` and `zod`.

**Step 3: Implement Auth Sheet**
Create the sheet container that toggles between Login and Register modes.

**Step 4: Connect to Navbar**
Update `Navbar` Account trigger to open `AuthSheet` if user is not logged in.

**Step 5: Run test**

**Step 6: Commit**
`feat(storefront-v3): implement auth sheet and forms`

---

### Task 5: Hybrid Auth System - Part 2 (Account Pages)

**Files:**
- Create: `apps/storefront-v3/src/app/account/layout.tsx`
- Create: `apps/storefront-v3/src/app/account/page.tsx` (Profile)
- Create: `apps/storefront-v3/src/app/account/orders/page.tsx`
- Create: `apps/storefront-v3/src/middleware.ts`

**Step 1: Write failing test**

**Step 2: Implement Layout**
Sidebar navigation for Account area (responsive: dropdown on mobile).

**Step 3: Implement Pages**
Basic scaffolding for Profile and Orders pages.

**Step 4: Implement Middleware**
Protect `/account` routes, redirecting unauthenticated users to home (or triggering auth sheet).

**Step 5: Run test**

**Step 6: Commit**
`feat(storefront-v3): implement account pages and middleware`
