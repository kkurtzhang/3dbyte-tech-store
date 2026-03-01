# Quick View Dialog Overhaul Design

**Date**: 2026-02-22
**Status**: Approved
**Goal**: Transform the quick view from a minimal preview into a comprehensive product preview that enables full add-to-cart functionality.

## Design Decisions

1. **Interaction Pattern**: Modal Dialog (expanded to max-w-4xl)
2. **Data Strategy**: On-Demand Fetch via `getProductByHandle()`
3. **Trigger UX**: Hover Reveal + Click (hover on desktop, always visible on mobile)

## Architecture

```
ProductCard
  └── QuickViewButton (new - hover-reveal trigger)
  └── QuickViewDialog (enhanced)
        ├── Loading Skeleton (during fetch)
        ├── QuickViewGallery (adapted from ProductGallery)
        ├── QuickViewContent
        │     ├── Title + Price + Stock Status
        │     ├── Variant Selector (from ProductActions)
        │     ├── Quantity Selector (new)
        │     └── Add to Cart / Notify Me
        └── Footer with "View Full Details" link
```

## Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│  ╳                                                       │
│ ┌─────────────────────┬─────────────────────────────────┤
│ │  [-30%] [🔥HOT]     │  Product Title                  │
│ │                     │  ~~$49.99~~  $34.99             │
│ │   Image Gallery     │  [🔥HOT DEAL - 30% OFF]         │
│ │   (50% width)       │                                 │
│ │                     │  ───────────────────────────    │
│ │   [thumb][thumb]    │  Color: [Black] [Silver] [...]  │
│ │                     │  Size:  [S] [M] [L] [XL]        │
│ │                     │                                 │
│ │                     │  Qty: [−] 1 [+]                 │
│ │                     │                                 │
│ │                     │  [==== ADD TO CART ====]        │
│ │                     │                                 │
│ │                     │  ↗ View Full Details            │
│ └─────────────────────┴─────────────────────────────────┘
```

## Components to Create/Modify

### New Components
1. **QuickViewButton** - Hover-reveal trigger button in ProductCard
2. **QuickViewGallery** - Simplified gallery with thumbnails and sale badges
3. **StockStatusBadge** - Extract from ProductActions to shared component
4. **PriceDisplay** - Reusable price component with sale support

### Enhanced Components
1. **QuickViewDialog** - Complete overhaul with data fetching and variant selection
2. **ProductCard** - Integrate new QuickViewButton

## Sale Display Logic

- **Image overlay**: `-XX%` badge (flame icon if ≥30%)
- **Price section**: Strikethrough original price, bold sale price in red
- **Sale badge**: `🔥 HOT DEAL - XX% OFF` below price (only if ≥20% discount)
- **Hot deal threshold**: ≥30% triggers red "HOT" styling

## Error Handling

- Loading skeleton during fetch
- Error state with "Try Again" button
- Graceful handling of: no variants, out of stock, no images, single image, null prices

## Accessibility

- Visually hidden DialogTitle for screen readers
- Focus trap within dialog
- Keyboard navigation for gallery (arrow keys)
- Aria labels for all interactive elements

## File Locations

```
apps/storefront-v3/src/
├── components/ui/
│   ├── stock-status-badge.tsx    (new - extracted)
│   └── price-display.tsx         (new)
├── features/product/components/
│   ├── product-card.tsx          (modified)
│   ├── quick-view-button.tsx     (new)
│   ├── quick-view-dialog.tsx     (overhauled)
│   └── quick-view-gallery.tsx    (new)
```
