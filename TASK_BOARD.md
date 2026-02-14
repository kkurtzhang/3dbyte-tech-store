# TASK_BOARD.md - 3DByte Tech Store

## Sprint: Website Audit & Content Integration

**Status:** Audit phase - content and UI fixes needed

**Last Updated:** Feb 15, 2026 (08:47 GMT+11)

---

## 📦 BACKLOG

| Owner | Task | Priority | Status |
|-------|------|----------|--------|
| @Pixel | PDP: Move "Frequently Bought Together" above "You Might Also Like" | High | ✅ Done |
| @Pixel | PDP: Align "Frequently Bought Together" under Add to Cart button | High | ✅ Done |
| @Architect | PDP: Fix Rich_description field rendering | High | ✅ Code fixed - CMS content empty |
| @Merchant | PDP: Connect Out of Stock logic to backend data | Medium | ✅ API queries fixed |
| @Architect | Docs Page: Update CMS content for 3D printing (TDS, SDS resources) | High | ⚠️ Requires CMS admin |
| @Architect | About-Us: Replace sofa.webp banner with 3D printing image | High | ⚠️ Requires image upload |
| @Pixel | About-Us: Add navigation entry point | Medium | ✅ Done |
| @Pixel | About-Us: Redirect /about-us to /about (remove duplicate) | Medium | ✅ Done |

---

## 📋 Notes

### CMS Authority
- Architect can modify CMS content/single types via URL or API
- Do NOT modify code in apps/cms folder (external service)
- CMS at: 192.168.0.45:1337
- Token available in apps/storefront-v3/.env

### Legal Pages Status
- ✅ privacy-policy: Content fetching correctly
- ✅ terms-and-condition: Content fetching correctly  
- ⚠️ returns: No CMS content type exists (using fallback)

### PDP Rich Description
- ✅ Code fixed: Now uses correct CMS fields (medusa_product_id, rich_description, product_handle)
- ⚠️ CMS content: All `rich_description` fields are empty - need to add content via CMS admin

### Key Files
- PDP: `apps/storefront-v3/src/app/products/[handle]/page.tsx`
- About: `apps/storefront-v3/src/app/about-us/page.tsx`

---

## 📁 Archive (Feb 13-15)

<details>
<summary>Completed Tasks (85 total)</summary>

- Cart API connected to Medusa SDK
- Collections API 500 error fixed
- CORS config fixed for localhost:3001
- Pages created: /help, /docs, /guides, /community, /about
- Footer links fixed
- Product pages, checkout, cart verified working
- All UI components from original sprint completed

</details>
