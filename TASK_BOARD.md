# TASK_BOARD.md - 3DByte Tech Store

## Sprint: DREMC Data Import

**Status:** Import started - Batch 1 in progress

**Last Updated:** Feb 19, 2026 (12:45 GMT+11)

---

## 🚧 IN PROGRESS

| Owner | Task | Priority | Started |
|-------|------|----------|---------|
| @ImageHunter | DREMC: Find manufacturer images for batch 1 | High | 13:00 |

---

## 📦 BACKLOG

| Owner | Task | Priority | Status |
|-------|------|----------|--------|
| @ImageHunter | DREMC: Find manufacturer images for batch 1 | High | ⏳ Waiting for scraper |
| @ContentWriter | DREMC: Generate original descriptions for batch 1 | Medium | ⏳ Waiting for scraper |
| @MediaAdmin | DREMC: Upload images to Strapi | Medium | ⏳ Waiting for images |
| @Importer | DREMC: Import batch 1 to Medusa | High | ⏳ Waiting for content |
| @Architect | Docs Page: Update CMS content for 3D printing | Medium | ⚠️ Requires CMS admin |
| @Architect | PDP: Add rich_description content to products | Medium | ⚠️ Requires CMS admin |

---

## 📊 Import Progress

### Batch 1 (Current)
- **Products to import:** 50
- **Status:** Extracting
- **Scraper:** Running
- **Categories/Brands:** Creating

### Overall Stats
- **Total products available:** 1,318 (excluding DREMC brand)
- **Total vendors:** 57
- **Total batches:** ~27 (50 products each)
- **Products imported:** 0

---

## 🗂️ Category Structure

```
/3d-printers
/filament
  ├── pla
  ├── petg
  ├── abs-asa
  ├── tpu
  └── specialty
/spare-parts
  ├── hotends
  ├── nozzles
  ├── extruders
  ├── thermistors
  ├── heater-cartridges
  └── beds
/electronics
  ├── mainboards
  ├── displays
  ├── stepper-drivers
  └── power-supplies
/motion
  ├── linear-rails
  ├── belts
  ├── bearings
  └── motors
/build-plates
/tools
/accessories
```

---

## 🏷️ Tag Design Decision (Feb 19)

**Decision:** Tags should NOT include category prefix.

- ✅ `ender-3`, `voron-2.4`, `brass`, `high-flow`
- ❌ `printer:ender-3`, `material:brass`

**Rationale:**
- Cleaner PDP rendering
- Category is backend metadata for filtering
- Tags can belong to multiple categories

---

## ✅ COMPLETED (Previous Sprint + DREMC Setup)

| Owner | Task | Priority | Verified |
|-------|------|----------|----------|
| @Architect | DREMC: Create category structure (27 categories) | High | ✅ All created |
| @Architect | DREMC: Create brand setup (57 vendors as metadata) | High | ✅ Ready for import |
| @Scraper | DREMC: Extract batch 1 products | High | ✅ 50 products |
| @Architect | Build Fix: Medusa v2 API array parameters | High | ✅ c813aff |
| @Architect | Build Fix: Dynamic rendering for CMS pages | High | ✅ Build passes |
| @Pixel | PDP: Move "Frequently Bought Together" above "You Might Also Like" | High | ✅ Done |
| @Architect | PDP: Fix Rich_description field rendering | High | ✅ Code fixed |
| @Merchant | PDP: Connect Out of Stock logic to backend data | Medium | ✅ API fixed |

---

## 📁 Archive (Feb 13-18)

<details>
<summary>Completed Tasks (95 total)</summary>

- Cart API connected to Medusa SDK
- Collections API 500 error fixed
- CORS config fixed for localhost:3001
- Pages created: /help, /docs, /guides, /community, /about
- All UI components from original sprint completed
- DREMC category structure designed
- DREMC vendor list extracted (57 vendors)
- Config files created: category-mapping.ts, manufacturer-sources.ts

</details>
