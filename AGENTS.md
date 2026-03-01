# AGENTS.md - Data Import Team

## 🎯 Current Mission: DREMC Product Data Import

**Goal:** Import 1,326 products (excluding DREMC own brand) with original content and manufacturer images.

**Constraints:**
- Exclude: DREMC & DREMC-STORE brand (255 products)
- Batch size: 50 products max per run
- Rate limit: Respectful scraping (avoid IP ban)
- Images: Source from manufacturers only
- Content: Original descriptions (no copying)

---

## 🤖 Agent Roster

| Agent | Role | Model | Workspace |
|-------|------|-------|-----------|
| @Architect | Coordinator & Category Design | zai/glm-5 | Root |
| @Scraper | DREMC Data Extraction | zai/glm-4.7 | /scripts/dremc-import |
| @ImageHunter | Manufacturer Image Sourcing | zai/glm-4.7 | /scripts/dremc-import |
| @ContentWriter | Original Product Descriptions | zai/glm-4.7 | /scripts/dremc-import |
| @MediaAdmin | Strapi Media Upload | zai/glm-4.7 | /scripts/dremc-import |
| @Importer | Medusa Product Import | zai/glm-4.7 | /scripts/dremc-import |

---

## 📊 Product Type Taxonomy

| Type | Description | Examples |
|------|-------------|----------|
| **physical** | Tangible products (default) | Filament, nozzles, motors, beds |
| **digital** | Downloadable content | STL files, print profiles, firmware |
| **service** | Intangible services | 3D printing service, consulting, repairs |
| **bundle** | Multi-product packages | Printer kits, starter packs, combo deals |
| **gift_card** | Store credit | Gift certificates |

**Recommendation:** Start with `physical` for all DREMC imports, add others as needed.

---

## 🔄 Import Pipeline

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  @Scraper   │───▶│  @Architect  │───▶│ @ImageHunter│
│  Extract    │    │  Map Cats    │    │  Find Images│
└─────────────┘    └──────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  @Importer  │◀───│  @MediaAdmin │◀───│@ContentWriter│
│  Medusa     │    │  Strapi      │    │  Descriptions│
└─────────────┘    └──────────────┘    └─────────────┘
```

### Batch Flow (50 products)
1. **@Scraper** - Extract 50 products (exclude DREMC brand)
2. **@Architect** - Validate category mapping
3. **@ImageHunter** - Find manufacturer images
4. **@ContentWriter** - Generate original descriptions
5. **@MediaAdmin** - Upload to Strapi (`{brand}/{sku}/xxx.webp`)
6. **@Importer** - Create products in Medusa

---

## 🛡️ Rate Limiting Strategy

### Scraper Rules
```typescript
const SCRAPER_CONFIG = {
  minDelayMs: 2000,        // 2 seconds between requests
  maxDelayMs: 5000,        // Random up to 5 seconds
  maxRetries: 3,           // Retry failed requests
  backoffMultiplier: 2,    // Exponential backoff
  maxRequestsPerMinute: 20, // Conservative limit
  respectRobotsTxt: true,
  userAgent: '3DByte-Tech-Data-Research/1.0'
}
```

### Batch Processing
- Process 50 products per session
- 2-minute pause between batches
- Log all requests for debugging
- Skip on rate limit errors (don't retry immediately)

---

## 📁 File Structure

```
/apps/backend/scripts/dremc-import/
├── config/
│   ├── rate-limiter.ts
│   ├── manufacturer-sources.ts  # Brand → Website mapping
│   └── category-mapping.ts      # DREMC → Our categories
├── scraper/
│   ├── scrape-categories.ts
│   ├── scrape-products.ts
│   └── filter-brand.ts
├── image-hunter/
│   ├── find-images.ts
│   └── convert-webp.ts
├── content/
│   └── generate-descriptions.ts
├── upload/
│   └── strapi-media.ts
├── import/
│   ├── create-products.ts
│   └── link-media.ts
└── data/
    ├── categories.json
    ├── products-batch-{n}.json
    └── import-log.json
```

---

## 🏷️ SKU Format (Hybrid)

```
3DB-{MANUFACTURER}-{ORIGINAL-SKU}

Examples:
- 3DB-LDO-ABG-350          (LDO product)
- 3DB-CRE-K1-NOZZLE-04     (Creality product)
- 3DB-E3D-V6-BRASS-04      (E3D product)
- 3DB-BTT-SKR-3-EZ         (BIGTREETECH product)
```

### SKU Rules
- Prefix: `3DB-` (3DByte)
- Manufacturer code: 2-4 letter abbreviation
- Original SKU: Manufacturer's SKU preserved
- Max length: 50 characters

---

## 🗂️ Category Structure Design

### Our Hierarchy
```
/
├── 3d-printers/           # Printer kits
├── filament/              # All filament types
│   ├── pla
│   ├── petg
│   ├── abs-asa
│   ├── tpu
│   └── specialty
├── spare-parts/           # Replacement parts
│   ├── hotends
│   ├── nozzles
│   ├── extruders
│   ├── thermistors
│   ├── heater-cartridges
│   └── beds
├── electronics/           # Boards, displays
│   ├── mainboards
│   ├── displays
│   ├── stepper-drivers
│   └── power-supplies
├── motion/                # Belts, rails, bearings
│   ├── linear-rails
│   ├── belts
│   ├── bearings
│   └── motors
├── build-plates/          # PEI, flex plates
├── tools/                 # 3D printing tools
└── accessories/           # Misc accessories
```

### Collections (Curated Groups)
- "Voron Compatible"
- "Creality Ender 3 Series"
- "Bambu Lab Compatible"
- "High-Temperature Printing"
- "Beginner Friendly"

### Tags (Flexible Labels)
- Printer: `ender-3`, `voron-2.4`, `bambu-x1`
- Material: `brass`, `hardened-steel`, `ruby`
- Feature: `high-flow`, `all-metal`, `direct-drive`

---

## ✅ Task Workflow

### Before Starting
1. @Architect creates category structure in Medusa
2. @Architect creates brand entities
3. @Scraper tests rate limiting on single product

### Per Batch (50 products)
1. @Scraper extracts products → `products-batch-{n}.json`
2. @Architect reviews category mapping
3. @ImageHunter finds images (marks unavailable)
4. @ContentWriter generates descriptions
5. @MediaAdmin uploads available images
6. @Importer creates products (skips if no image)
7. Log results → `import-log.json`

### Quality Checks
- [ ] No DREMC brand products imported
- [ ] All images from manufacturer sources
- [ ] Descriptions are original (plagiarism check)
- [ ] SKUs follow hybrid format
- [ ] Categories properly assigned
- [ ] Images in correct Strapi path

---

## 📝 Notes

### Manufacturer Image Sources
| Brand | Website | Notes |
|-------|---------|-------|
| Creality | creality.com | Good product pages |
| LDO | ldomotors.com | Voron kit specialist |
| E3D | e3d-online.com | Premium hotends |
| Bondtech | bondtech.se | Extruders |
| BTT | bigtree-tech.com | Mainboards |
| Micro Swiss | micro-swiss.com | Upgrade parts |
| Phaetus | phaetus.com | Hotends |
| Trianglelab | trianglelab.net | Budget alternatives |

### Skipping Rules
- Products without manufacturer images → Skip
- Products with only DREMC images → Skip
- Discontinued products → Mark for review
- Duplicate products → Keep higher quality

---

## 🚀 Getting Started

```bash
# 1. Create directory structure
mkdir -p apps/backend/scripts/dremc-import/{config,scraper,image-hunter,content,upload,import,data}

# 2. First run: Categories only
openclaw sessions spawn --agentId scraper --task "Extract DREMC category structure only, no products yet"

# 3. After category review: First batch
openclaw sessions spawn --agentId scraper --task "Extract first batch of 50 products, exclude DREMC brand"
```

---

*Created: Feb 18, 2026*
*Previous version archived: docs/archive/AGENTS-ARCHIVE-FEB18.md*
