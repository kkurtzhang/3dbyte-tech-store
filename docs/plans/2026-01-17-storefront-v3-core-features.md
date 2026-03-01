# Storefront v3 Core Features Design

## Overview
This document outlines the design for implementing core e-commerce features in `apps/storefront-v3`: Order Confirmation, Shop Page, and Collections/Categories. These features are essential for a functional store and fill the gap between the current v3 MVP and the v2 reference.

## Design Style: "The Lab"
- **Theme**: "Electric Cyan" (`--primary: 189 94% 43%`) on monochrome background.
- **Typography**: Inter (sans) & JetBrains Mono (mono).
- **Aesthetics**: Clean, technical, utilitarian. High contrast, technical data display (specs), grid layouts.

## 1. Order Confirmation Page

### Route
`app/order/confirmed/[id]/page.tsx`

### Components
- **OrderSummary**: Displays items, totals, and shipping details.
- **OrderDetails**: Order ID, date, status, payment method.
- **StatusBadge**: Visual indicator of order status using Lab colors.

### Data Fetching
- Fetch order by ID using `medusaClient.orders.retrieve(id)`.
- **Note**: This should be a **Server Component**.

### Layout
- **Hero**: "Order Confirmed" heading with large checkmark icon (Cyan).
- **Grid**: Two-column layout on desktop (Details Left, Summary Right).
- **Actions**: "Continue Shopping" button (Primary) and "Print Receipt" (Ghost).

## 2. Shop Page (Product Listing)

### Route
`app/shop/page.tsx`

### Features
- **Grid Layout**: Responsive grid of `ProductCard` components.
- **Sidebar/Drawer**: Filters for Categories, Collections, Price (if applicable).
- **Sorting**: "Newest", "Price: Low-High", "Price: High-Low".
- **Pagination**: Numbered pagination or "Load More".

### Data Fetching
- Use `getProducts` from `lib/medusa/products`.
- Accept `searchParams` for `page`, `sort`, `collection`, `category`.

### Design Alignment
- **Header**: Simple "All Products" with total count (Mono font).
- **Filters**: Accordion-style filters (using `components/ui/accordion`).

## 3. Collections & Categories

### Routes
- `app/collections/[handle]/page.tsx`
- `app/categories/[...category]/page.tsx`

### Implementation
- **Reusability**: These pages should reuse the **Shop Page** layout and components (`ProductGrid`, `FilterSidebar`).
- **Dynamic Content**: Fetch collection/category title and description to display as the page header.
- **Metadata**: Generate dynamic metadata based on collection/category name.

### Data Fetching
- **Collections**: `medusaClient.collections.list({ handle: [handle] })` -> then `getProducts` with `collection_id`.
- **Categories**: `medusaClient.productCategories.list({ handle: categoryHandle })` -> then `getProducts` with `category_id`.

## Technical Implementation Plan

### Dependencies
- Existing `ProductCard` (refine if needed for v3 style).
- Existing `medusaClient`.
- New `Order` types if missing in `shared-types`.

### Step-by-Step
1. **Order Confirmation**:
   - Create `features/order/components/order-summary.tsx`.
   - Implement `app/order/confirmed/[id]/page.tsx`.
2. **Shop Infrastructure**:
   - Create `features/shop/components/product-grid.tsx` (if not existing).
   - Create `features/shop/components/shop-filters.tsx`.
   - Create `features/shop/components/shop-sort.tsx`.
3. **Shop Page**:
   - Implement `app/shop/page.tsx` connecting filters and grid.
4. **Dynamic Routes**:
   - Implement `app/collections/[handle]/page.tsx` reusing Shop components.
   - Implement `app/categories/[...category]/page.tsx` reusing Shop components.

## Future Scope
These features are deferred to a later phase but are critical for full parity:

- **Blog**:
  - Routes: `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`.
  - Integration: Fetch content from Strapi (Headless CMS).
- **Static Pages** (About, FAQ, Terms):
  - Routes: `app/about/page.tsx`, `app/faq/page.tsx`, etc.
  - **Note**: These are "static" in routing but dynamic in content; they fetch data from Strapi single-types/collections to allow CMS management.
- **Localization**: Country/Region support.
