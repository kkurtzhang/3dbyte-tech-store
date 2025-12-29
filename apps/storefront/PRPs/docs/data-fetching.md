# OVERVIEW
This is the breakdown of which sections and webpages retrieve data from the MedusaJS server (E-commerce engine) versus the Strapi CMS server (Content Management System), along with a summary of how they communicate.

# DATA SOURCES: QUICK REFERENCE

| Page/Section | Primary Source | Secondary Source | Pattern |
|--------------|----------------|------------------|---------|
| **Hero Section** | Strapi | - | CMS-only |
| **Product Listings** | Meilisearch | Medusa (fallback) | Search-first |
| **Product Details** | Medusa | Strapi | Storefront Composition |
| **Blog Posts** | Strapi | - | CMS-only |
| **Static Pages** | Strapi | - | CMS-only |
| **Global Search** | Meilisearch | - | Unified search |

# ARCHITECTURE PATTERNS

## 1. Search Path: Meilisearch (Medusa as Aggregator)

For search functionality, we use **Meilisearch** with the **Medusa as Aggregator** pattern:
- Medusa is the single source of truth for the products index
- Medusa fetches enriched content from Strapi before indexing
- Next.js queries Meilisearch directly for fast, filtered search

**Flow**: Product Update → Medusa Subscriber → Fetch Strapi Content → Merge → Push to Meilisearch

## 2. Read Path: Storefront Composition (Parallel Fetching)

For rendering pages, we use **Storefront Composition**:
- Next.js fetches from Medusa and Strapi in parallel using `Promise.all`
- Data is merged in the server component
- Each source can be cached independently

**Flow**: Next.js → Parallel (Medusa + Strapi) → Merge → Render

**See also**: `/docs/meilisearch-integration-guide.md` for comprehensive guide.

# 1. Webpage & Section Hierarchy

### A. Homepage (`/`)

The Homepage is a hybrid page that aggregates data from both sources to create a content-rich shopping experience.

* **Hero Section** (`<Hero />`)
* **Source:** Strapi CMS
* **Data:** Headline, text, CTA button links, and the hero background image.
* **Function:** `getHeroBannerData()`


* **Collections Grid** (`<Collections />`)
* **Source:** Hybrid (Strapi + Medusa)
* **Data:**
* *Strapi:* Collection images, custom titles, and descriptions (`cmsCollections`).
* *Medusa:* Validates that the collections actually exist in the store and provides the handle/slug for linking (`medusaCollections`).


* **Logic:** It fetches collections from both, then filters the Strapi collections to ensure they match valid Medusa collections.


* **Bestsellers / Product Carousel** (`<ProductCarousel />`)
* **Source:** MedusaJS
* **Data:** Product list, prices, variants, and thumbnails.
* **Function:** `getProductsList()`


* **Mid-Page Banner** (`<Banner />`)
* **Source:** Strapi CMS
* **Data:** Promotional image, headline, text, and CTA.
* **Function:** `getMidBannerData()`


* **Explore Blog / Get Inspired** (`<ExploreBlog />`)
* **Source:** Strapi CMS
* **Data:** Recent blog post summaries (thumbnails, titles, slugs).
* **Function:** `getExploreBlogData()`



---

### B. Product Page (`/products/[handle]`)

This page is almost exclusively driven by the e-commerce engine.

* **Product Details** (`<ProductTemplate />`)
* **Source:** MedusaJS
* **Data:** Product title, description, gallery images, variants, options, prices, and inventory.
* **Function:** `getProductByHandle()`



---

### C. Shop / Store Page (`/shop`)

* **Product Listing** (`<StoreTemplate />`)
* **Source:** MedusaJS
* **Data:** List of all products, pagination, and filtering options.
* **Function:** `getProductsList()` (likely used within the template or its children).



---

### D. Blog Pages

Content-heavy pages driven primarily by the CMS, with some commerce integration.

* **Blog Listing** (`/blog`)
* **Categories:** Strapi CMS (`getBlogPostCategories`)
* **Blog Posts:** Strapi CMS (via `BlogTemplate` using `getBlogPosts` logic).
* **Recommended Products:** MedusaJS (Sidebar or bottom section products via `getProductsList`).


* **Blog Post** (`/blog/[slug]`)
* **Article Content:** Strapi CMS (`getBlogPostBySlug` retrieves content, title, featured image).



---

### E. Static Content Pages

These pages are purely informational and managed entirely via the CMS.

* **About Us** (`/about-us`)
* **Source:** Strapi CMS
* **Sections:** Banner, Our Story, Why Us (Framed Text), Craftsmanship, and Numerical stats.
* **Function:** `getAboutUs()`


* **Privacy Policy** (`/privacy-policy`)
* **Source:** Strapi CMS
* **Data:** Rich text content serialized from MDX.
* **Function:** `getContentPage('privacy-policy', ...)`


* **Terms & Conditions** (`/terms-and-conditions`)
* **Source:** Strapi CMS
* **Data:** Rich text content serialized from MDX.
* **Function:** `getContentPage('terms-and-condition', ...)`



---

# 2. Server Communication Summary

The application uses two distinct methods to communicate with its backend servers, defined in the `src/lib` directory.

### MedusaJS Communication (E-commerce)

* **Mechanism:** Medusa JS SDK
* **Implementation:**
* Located in `src/lib/config.ts`.
* It initializes a client using the `Medusa` class from `@medusajs/js-sdk`.
* It uses a Publishable API Key (`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`) to authenticate requests.


* **Usage Pattern:**
* Calls are made using methods like `sdk.store.product.list(...)`.
* This is used for dynamic, transactional data like products, prices, regions, and carts.



### Strapi CMS Communication (Content)

* **Mechanism:** Standard Fetch API
* **Implementation:**
* Located in `src/lib/data/fetch.ts`.
* It uses a helper function `fetchStrapiClient` which wraps the native JavaScript `fetch`.
* It authenticates using a Bearer Token (`NEXT_PUBLIC_STRAPI_READ_TOKEN`) in the Authorization header.


* **Usage Pattern:**
* Calls hit specific API endpoints (e.g., `/api/homepage`, `/api/blogs`).
* It heavily utilizes Strapi's `populate` parameter to retrieve nested relationships (e.g., `populate[1]=HeroBanner`).
* Next.js caching tags (e.g., `next: { tags: ['hero-banner'] }`) are attached to these requests to enable On-Demand Revalidation when content is updated in the CMS.