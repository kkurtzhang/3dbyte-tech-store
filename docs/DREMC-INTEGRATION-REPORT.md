# DREMC Store Integration Report

**Source:** https://store.dremc.com.au/  
**Platform:** Shopify (dremc-store.myshopify.com)  
**Analysis Date:** Feb 18, 2026  
**Total Products:** 1,581 (1,327 in stock, 254 out of stock)

---

## Executive Summary

DREMC is a Brisbane-based 3D printing supplies store with a comprehensive Shopify catalog. This report maps their data structure to our Medusa v2 + Strapi v5 architecture for potential data integration/scraping.

---

## 1. Source Data Structure (Shopify)

### Product Schema
```json
{
  "id": 8871238009001,
  "title": "Box Turtle APEX Gearset Upgrade",
  "handle": "box-turtle-apex-gearset-upgrade",
  "body_html": "<p>Product description...</p>",
  "vendor": "LDO",
  "product_type": "Spare Parts",
  "tags": ["3D", "LDO"],
  "variants": [{
    "id": 46818206023849,
    "title": "Default Title",
    "sku": "LDO-APEX-GEARSET",
    "price": "33.45",
    "grams": 50,
    "compare_at_price": null,
    "available": true
  }],
  "images": [{
    "id": 43779213394089,
    "src": "https://cdn.shopify.com/s/files/...",
    "width": 1500,
    "height": 1500
  }],
  "options": [{
    "name": "Title",
    "values": ["Default Title"]
  }]
}
```

### Key Fields
| Shopify Field | Description | Our Target |
|---------------|-------------|------------|
| `handle` | URL slug | `product.handle` |
| `title` | Product name | `product.title` |
| `body_html` | Description | `product.description` |
| `vendor` | Brand name | `brand` (custom entity) |
| `product_type` | Category type | `product_category` |
| `tags` | Categorization | `product_tags` |
| `variants[].sku` | SKU | `product_variant.sku` |
| `variants[].price` | Price (AUD) | `product_variant.prices` |
| `variants[].grams` | Weight | `product_variant.weight` |
| `images[].src` | Image URLs | `product_images.url` |

---

## 2. Category Mapping

### Shopify Product Types → Medusa Categories

| DREMC Product Type | Count | Recommended Medusa Category |
|--------------------|-------|----------------------------|
| Spare Parts | 367 | `/spare-parts` |
| Nozzle | 99 | `/spare-parts/nozzles` |
| Hotend Assembly | 88 | `/spare-parts/hotends` |
| Upgrade Kit | 75 | `/upgrade-kits` |
| Mainboard | 76 | `/electronics/mainboards` |
| Stepper Motor | 67 | `/electronics/motors` |
| Extruder | 35 | `/spare-parts/extruders` |
| Timing Belt | 33 | `/motion/belts` |
| Build Surface | 27 | `/build-plates` |
| Thermistor | 27 | `/spare-parts/thermistors` |
| Silicon Socks | 36 | `/consumables/silicone-socks` |
| Fan | 59 | `/electronics/fans` |
| Filament | 77 | `/filament` |
| 3D Printers Kit | 22 | `/printer-kits` |
| Tools | 39 | `/tools` |
| Heater Cartridge | 24 | `/spare-parts/heaters` |
| Heat Break | 24 | `/spare-parts/heat-breaks` |
| Heater Block | 22 | `/spare-parts/heater-blocks` |
| Linear Rail | 19 | `/motion/linear-rails` |
| Bed | 19 | `/spare-parts/beds` |
| Display | 23 | `/electronics/displays` |
| Direct Drive | 27 | `/spare-parts/direct-drive` |

### Shopify Collections (Nested Structure)

| Collection | Product Count | Hierarchy Suggestion |
|------------|---------------|----------------------|
| 3D Printer Accessories & Consumable | 1,736 | Parent category |
| 3D Printer Bed | 23 | `/spare-parts/beds` |
| 3D Printer Bearing & POM Wheels | 27 | `/motion/bearings` |

---

## 3. Brand/Vendor Mapping

**60+ Brands** - Top vendors by product count:

| Vendor | Products | Notes |
|--------|----------|-------|
| Creality | 280 | Major printer manufacturer |
| DREMC | 255 | Their own brand (filament, parts) |
| LDO | 188 | Voron kit specialist |
| Trianglelab | 110 | Hotends, nozzles |
| Micro Swiss | 82 | Upgrade parts |
| Fysetc | 79 | Electronics, boards |
| E3D | 70 | Premium hotends |
| Bondtech | 57 | Extruders |
| BIGTREETECH | 60 | Mainboards, electronics |
| Polymaker | 20 | Filament brand |

**Integration Approach:**
- Create `brand` custom entity in Medusa
- Map `vendor` → `brand.name`
- Add brand logos/descriptions manually

---

## 4. Tag Mapping Strategy

### Tag Categories Observed

| Tag Pattern | Example | Mapping |
|-------------|---------|---------|
| Printer Compatibility | `Anycubic Kobra S1`, `Creality K1 Series` | `product_tags` or custom `compatibility` field |
| Brand Tags | `LDO`, `3D` | Skip (redundant with vendor) |
| Material Type | Implied by product type | Category assignment |

### Recommended Tag Structure
```
- printer_compatibility: ["Voron 2.4", "Ender 3", "Bambu Lab"]
- material_type: ["Brass", "Stainless Steel", "Hardened Steel"]
- feature: ["High Flow", "All Metal", "Direct Drive"]
```

---

## 5. Filament Product Analysis

DREMC has their own filament brand with detailed specs:

### Filament Types Available
- **PLA+ HS** (High Speed)
- **PLA Sparkle**
- **ABS+ Sparkle**
- **ASA**
- **ASA Sparkle**
- **PC-ABS**
- **TPU**
- **PETG**

### Filament Product Structure
```
Product: DREMC PLA+ HS High Speed Filament 1.75mm 1kg
├── Variants (by color): 20+ colors
│   ├── SKU: DR-PLAHS-BLK (Black)
│   ├── SKU: DR-PLAHS-WHT (White)
│   └── ... (18 more colors)
├── Specs:
│   ├── Diameter: 1.75mm (±0.03mm)
│   ├── Weight: 1kg net
│   ├── Spool: Cardboard (AMS compatible)
│   └── Print Temp: 190-240°C
```

### Color Variant Mapping
Filaments use variants for colors. Need to:
1. Create parent product
2. Create variants per color
3. Map variant images to specific colors

---

## 6. Integration Architecture

### Data Flow
```
Shopify API → Scraper Script → Transform → Medusa API
                                        ↘ Strapi API (CMS content)
```

### API Endpoints Available
| Endpoint | Use |
|----------|-----|
| `/collections.json` | Get all collections |
| `/products.json?limit=250` | Get products (paginated) |
| `/products/{handle}` | Individual product |

### Rate Limits
- Shopify public API: ~2 requests/second
- 1,581 products ÷ 250 per page = ~7 requests minimum
- Full scrape: ~5-10 minutes with rate limiting

---

## 7. Recommended Mapping to Our Schema

### Medusa v2 Product Entity
```typescript
{
  title: shopifyProduct.title,
  handle: shopifyProduct.handle,
  description: shopifyProduct.body_html, // Strip HTML
  subtitle: null,
  is_giftcard: false,
  discountable: true,
  images: shopifyProduct.images.map(img => ({
    url: img.src,
    metadata: { width: img.width, height: img.height }
  })),
  tags: shopifyProduct.tags.map(t => ({ value: t })),
  categories: [/* map from product_type */],
  // Custom fields
  metadata: {
    shopify_id: shopifyProduct.id,
    vendor: shopifyProduct.vendor,
    original_url: `https://store.dremc.com.au/products/${shopifyProduct.handle}`
  }
}
```

### Medusa v2 Product Variant
```typescript
{
  title: variant.title,
  sku: variant.sku,
  allow_backorder: !variant.available,
  manage_inventory: true,
  weight: variant.grams / 1000, // grams to kg
  prices: [{
    amount: Math.round(parseFloat(variant.price) * 100), // to cents
    currency_code: "aud"
  }],
  compare_at_price: variant.compare_at_price 
    ? Math.round(parseFloat(variant.compare_at_price) * 100) 
    : null
}
```

### Strapi v5 CMS Content
```typescript
{
  // Rich content not in Shopify basic data
  rich_description: "", // Would need to scrape full product pages
  specifications: {}, // Extract from body_html
  compatibility: [], // Extract from tags/description
  documentation_links: [] // Extract from description
}
```

---

## 8. Missing Data / Gaps

### Not Available via JSON API
| Data | Source | Effort |
|------|--------|--------|
| Detailed specifications | Full page scrape | Medium |
| Print temperature settings | Full page scrape | Low |
| Compatibility lists | Full page scrape | Medium |
| Customer reviews | Reviews API/widget | High |
| Stock levels | Variant `available` only | N/A |

### Would Require Page Scraping
- Print temperature ranges
- Bed temperature settings
- Material specifications tables
- Related products
- Breadcrumb/category hierarchy

---

## 9. Implementation Recommendations

### Phase 1: Basic Import (Low Effort)
1. Scrape `/products.json?limit=250` (all pages)
2. Create brands from unique vendors
3. Create categories from product_types
4. Import products with variants
5. Download and store images locally

### Phase 2: Enrichment (Medium Effort)
1. Full page scrape for specifications
2. Extract compatibility data from descriptions
3. Build category hierarchy from breadcrumbs
4. Add rich content to Strapi CMS

### Phase 3: Sync (Ongoing)
1. Compare by `shopify_id` in metadata
2. Update prices/availability daily
3. Add new products automatically
4. Flag discontinued items

---

## 10. Technical Implementation

### Scraper Script Structure
```bash
/apps/backend/scripts/
├── dremc-scraper/
│   ├── index.ts           # Main entry
│   ├── shopify-client.ts  # API client
│   ├── transformers.ts    # Data mapping
│   ├── medusa-import.ts   # Medusa API calls
│   └── image-downloader.ts
```

### Dependencies
- `node-fetch` or `axios` for API calls
- `cheerio` for HTML parsing (Phase 2)
- `turndown` for HTML → Markdown
- `sharp` for image processing

---

## 11. Legal & Ethical Considerations

⚠️ **Important Notes:**
- This is a competitor's data
- Shopify ToS allows personal/analysis use
- **Do not copy images directly** - they may be licensed
- Product descriptions may be manufacturer-provided
- Consider reaching out for official data feed/API access

### Recommended Approach
1. Use data for **reference only** initially
2. Build category structure based on their taxonomy
3. Create original product descriptions
4. Source images from manufacturers directly
5. Consider partnership/dropshipping arrangement

---

## 12. Next Steps

1. **Decision:** Full data import vs. structural reference only?
2. **Legal Review:** Check with Kurt on data usage policy
3. **Brand Outreach:** Contact DREMC about partnership/API access
4. **Pilot:** Scrape 10-20 products as proof-of-concept
5. **Automate:** Build scheduled sync if approved

---

## Appendix: Full Brand List

```
Adam Tech, AG, AJAX, ANTCLABS, Anycubic, Artillery 3D, 
BIGTREETECH, Bondtech, Capricorn, Cartographer3D, CNC Kitchen, 
Cookiecad, Creality, Delta Electronics, DEVIL DESIGN, DREMC, 
DREMC-STORE, Duet3D, E3D, Elegoo, Ember Prototypes, Fabreeko, 
Flashforge, Fysetc, Gates, GDSTIME, HIWIN, IGUS, IWISS, JST, 
Keenovo, LDO, Luke's Laboratory, Magigoo, Mean Well, Mellow3D, 
Micro Swiss, Miniware, MISUMI, Molex, Moons, MY3Dtech, NSK, 
Omron, Phaetus, Pine64, Polymaker, Proto Pasta, Provok3d, 
QIDI TECH, Schallenkammer, Slice Engineering, Sovol, Sunon, 
TBI Motion, Trianglelab, Vector 3D, Wago, West3D
```

---

*Report generated by @Architect - 3DByte Tech Store*
