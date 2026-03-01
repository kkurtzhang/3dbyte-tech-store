# Storefront V3 Implementation Plan

**Design**: [The Lab](./2026-01-13-storefront-v3-design.md)
**Tech Stack**: Next.js 16, Medusa, Strapi, Meilisearch

## Phase 1: Foundation & Design System
**Goal**: Set up the project structure, base styling, and core layout.

- [x] **Project Setup**
  - [x] Initialize clean Next.js 16 app in `apps/storefront-v3`.
  - [x] Install dependencies: `tailwindcss-animate`, `lucide-react`, `nuqs`, `clsx`, `tailwind-merge`.
  - [x] Configure `tailwind.config.ts` with "Electric Cyan" palette and fonts (`Inter` + `JetBrains Mono`).
  - [x] Setup `src/` directory structure (features, components, lib).

- [x] **Base UI Components (shadcn/ui)**
  - [x] Install core primitives: Button, Input, Sheet, Card, Badge, Toast, Separator.
  - [x] Customize components to match "The Lab" aesthetic (1px borders, small radius).
  - [x] Create `Container` and `Section` layout components.

- [x] **Global Layout**
  - [x] Implement `Header` (Sticky, Minimalist).
  - [x] Implement `MobileNav` (Bottom Bar).
  - [x] Implement `Footer`.
  - [x] Setup `theme-provider`.

## Phase 2: Core Data Layer
**Goal**: robust, type-safe clients for all external services.

- [x] **Medusa Client**
  - [x] Verify `lib/medusa/client.ts`.
  - [x] Implement typed fetchers: `getProducts`, `getProduct`, `getCollections`.
  - [x] Ensure `shared-types` are used.

- [x] **Strapi Client**
  - [x] Verify `lib/strapi/client.ts`.
  - [x] Implement fetchers: `getStrapiContent`.
  - [x] Setup Tag-based Revalidation (`revalidateTag`).

- [x] **Meilisearch Client**
  - [x] Install `meilisearch` (JS client).
  - [x] Create `lib/search/client.ts`.
  - [x] Create React hook `useSearch` for client-side queries.

## Phase 3: Browse Experience (Search-First)
**Goal**: Fast, unified browsing via Meilisearch.

- [x] **Unified Search Interface**
  - [x] Create `features/search/search-input.tsx` (Instant search).
  - [x] Create `features/search/search-results.tsx` (Grid of cards).
  - [x] Implement "No Results" and "Loading" states.

- [x] **Product Listing Page (PLP)**
  - [x] Build `ProductCard` ("Lab" style: Image, Title, Mono Price, Spec Badge).
  - [x] Implement Sidebar Filters (Desktop) and Drawer Filters (Mobile).
  - [x] Sync state with URL via `nuqs`.

- [x] **Homepage**
  - [x] Build "Hero Spec" component.
  - [x] Build "Featured Categories" grid.
  - [x] Fetch data from Strapi (Layout) + Medusa (Products).

## Phase 4: Product Experience (PDP)
**Goal**: A technical, detail-oriented product page.

- [x] **Product Data Composition**
  - [x] Create `app/products/[handle]/page.tsx` with parallel fetching.
  - [x] Combine Medusa Product + Strapi Rich Content.

- [x] **Gallery & Variants**
  - [x] Build `ProductGallery` with dynamic filtering.
  - [x] Build `VariantSelector` (Chip style in ProductActions).
  - [x] Sync selection with URL params (`?variant=id`).

- [x] **Product Details**
  - [x] Build `ProductInfo` (Title, Mono Price).
  - [x] Build `SpecSheet` (Table component for specs).
  - [x] Implement `AddToCart` with optimistic UI (Cart Context).

## Phase 5: Cart & Checkout
**Goal**: Frictionless, reliable purchasing.

- [x] **Cart**
  - [x] Implement `CartSheet` (Slide-out).
  - [x] Create Server Actions: `addToCart`, `updateLineItem`, `removeItem`.
  - [x] Implement Optimistic UI updates (via `useCart` hook).

- [x] **Checkout**
  - [x] Build `app/(checkout)/layout.tsx` (Isolated).
  - [x] Implement Checkout UI Flow (Address -> Delivery -> Payment).
  - [x] Connect Checkout to Medusa Backend (Server Actions).
  - [x] Integrate Stripe/PayPal Elements.

## Phase 6: Polish & Launch
- [ ] **SEO**: Metadata, OpenGraph, JSON-LD (Product).
- [ ] **Performance**: Analyze bundles, optimize images.
- [ ] **Quality Assurance**: Mobile responsiveness check.
