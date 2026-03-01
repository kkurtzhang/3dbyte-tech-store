# Storefront V3 Design: "The Lab"

**Date**: 2026-01-13
**Status**: Approved
**Theme**: The Lab (Technical, Precise, High-Performance)
**Color Palette**: Electric Cyan + Slate Monochrome

## 1. Executive Summary

Storefront V3 is a complete overhaul of the customer-facing application, moving to **Next.js 16** (App Router, PPR) with a **"Lab" aesthetic**. The design prioritizes technical clarity for makers and engineers, showcasing 3D printing filaments, Voron kits, and hardware with precision.

The architecture uses **Storefront Composition** (parallel fetching from Medusa and Strapi) and **Direct-to-Meilisearch** for browsing, ensuring sub-100ms interactions.

## 2. Design System: "The Lab"

### 2.1 Aesthetic Principles
- **Precision over decoration**: Thin 1px borders, no soft shadows, crisp edges.
- **Data-first**: Technical specs (diameter, temp, material) are citizens, not footer notes.
- **High Contrast**: Stark white/slate backgrounds with high-legibility text.

### 2.2 Typography
- **Primary (Headings/Body)**: `Inter` or `Geist Sans`
  - Clean, modern, highly legible at small sizes.
- **Technical (Prices/Specs/Badges)**: `JetBrains Mono` or `Geist Mono`
  - Used for: Prices (`$29.99`), SKUs, Temps (`210°C`), Dimensions (`1.75mm`).
  - Adds the "engineered" feel.

### 2.3 Color Palette
- **Base**:
  - Background: White (`#ffffff`)
  - Surface: Slate-50 (`#f8fafc`)
  - Text: Slate-900 (`#0f172a`)
  - Muted: Slate-500 (`#64748b`)
  - Border: Slate-200 (`#e2e8f0`)
- **Accent (Electric Cyan)**:
  - Primary: Cyan-500 (`#06b6d4`) - Buttons, Active States, Links
  - Hover: Cyan-600 (`#0891b2`)
  - Subtle: Cyan-50 (`#ecfeff`) - Background highlights

### 2.4 UI Components (Hybrid shadcn/ui)
- **Radius**: Small (`0.3rem`) for a technical look.
- **Borders**: 1px solid, distinct.
- **Shadows**: None or very subtle hard shadows.
- **Icons**: `lucide-react` (thin stroke: 1.5px).

## 3. Architecture

### 3.1 Stack
- **Framework**: Next.js 16.1.0 (App Router, Server Actions, PPR).
- **Styling**: Tailwind CSS + shadcn/ui.
- **State**: URL-driven (search params) + `nuqs`.

### 3.2 Data Strategy (Storefront Composition)
- **Parallel Fetching**:
  ```tsx
  // app/products/[handle]/page.tsx
  const [product, content] = await Promise.all([
    medusa.products.retrieve(handle), // Dynamic / Short Cache
    strapi.find('product-content', { handle }) // Cached (Tag-based)
  ]);
  ```
- **Search**: Direct Client-to-Meilisearch using `meilisearch-js`.
- **Cart**: Server Actions + Optimistic UI.

## 4. Key Page Designs

### 4.1 Homepage
- **Hero**: "Tech Spec" style. Large product image (e.g., Voron Kit) with callouts pointing to components (Linear Rail, Extruder) with mono-font labels.
- **Featured Categories**: Grid of rigid cards. Icon + Label.
- **New Arrivals**: Horizontal scroll (mobile) / Grid (desktop).

### 4.2 Unified Search & Browse (PLP)
- **Layout**: Sidebar Filters (Desktop) / Bottom Drawer (Mobile).
- **Product Card**:
  - Aspect Ratio: 1:1 or 4:3.
  - Content: Title, Brand, **Spec Badge** (`1.75mm`), Price (Mono).
  - Interaction: Hover shows "Quick Specs" (Temp, Material).
- **Search**: Instant-search input in header. Results update in real-time.

### 4.3 Product Detail Page (PDP)
- **Layout**: Two-column (Desktop). Left: Gallery. Right: Buy Box.
- **Gallery**:
  - **Dynamic Variant Switching**: Selecting "Red" filters gallery to only show red filament images.
- **Buy Box**:
  - Title & Price (Large Mono).
  - **Variant Selectors**: Chip style.
  - **Spec Sheet**: High-visibility data table (Bed Temp, Nozzle Temp, Tolerance).
- **Rich Content**: "Deep Dive" section below (Strapi) with diagrams, print settings, and detailed assembly guides (for Kits).

### 4.4 Checkout
- **Isolation**: No header/footer navigation.
- **Step-based**: Information -> Shipping -> Payment.
- **Guest-first**: No forced login.

## 5. Mobile Experience
- **Navigation**: Bottom Bar (Home, Search, Cart, Account).
- **Gestures**: Swipeable image carousels.
- **Drawers**: Filters and Menus open as bottom sheets.
- **Touch Targets**: Minimum 44px for all interactions.

## 6. Implementation Guidelines
- **File Structure**: Feature-based (`src/features/product`, `src/features/cart`).
- **Performance**: Strict budget. LCP < 1.2s. Use `next/image` rigorously.
- **Accessibility**: Keyboard navigable, semantic HTML, proper ARIA labels.
