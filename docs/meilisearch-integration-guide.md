# Meilisearch Integration Guide
## Medusa v2 + Strapi v5 + Next.js 16 Architecture

This guide provides comprehensive patterns for integrating Meilisearch with Medusa v2 using the official architecture: **Modules, Loaders, and Workflows**.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Medusa v2 Patterns](#medusa-v2-patterns)
3. [Implementation: Strapi Loader](#implementation-strapi-loader)
4. [Implementation: Meilisearch Module](#implementation-meilisearch-module)
5. [The Aggregator Workflow](#the-aggregator-workflow)
6. [Next.js Storefront](#nextjs-storefront)

---

## Architecture Overview

### Why This Architecture?

In Medusa v2, integrations are no longer just "plugins" like v1. They use:
- **Modules**: Reusable packages with single-feature functionality
- **Loaders**: Inject external services into the Medusa container
- **Workflows**: Orchestrate multi-step operations with automatic rollback

### Data Flow: Medusa as Aggregator

```
┌─────────────────────────────────────────────────────────────────┐
│  Event: product.created / product.updated                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Subscriber: src/subscribers/product-index.ts                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Fetch Product from Medusa (productModule)            │   │
│  │ 2. Fetch Content from Strapi (strapi loader)            │   │
│  │ 3. Merge data                                           │   │
│  │ 4. Push to Meilisearch (meilisearch module)             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Meilisearch Index                            │
│  { id, title, price, handle, rich_description, ... }            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Medusa v2 Patterns

### 1. Loaders (External Service Injection)

Loaders inject external services into the Medusa container, making them available throughout your application.

**Example**: Injecting Strapi client

```typescript
// src/loaders/strapi.ts
import { MedusaContainer } from "@medusajs/framework/types"
import StrapiClient from "@strapi/client"

export default async function strapiLoader(
  container: MedusaContainer
) {
  const strapiClient = new StrapiClient({
    url: process.env.STRAPI_URL || "http://localhost:1337",
    apiKey: process.env.STRAPI_API_KEY,
  })

  container.register("strapi", strapiClient)
}
```

Register in `medusa-config.ts`:

```typescript
module.exports = defineConfig({
  // ...
  loaders: [
    {
      resolve: "./src/loaders/strapi.ts",
    },
  ],
})
```

### 2. Modules (Custom Functionality)

Modules are reusable packages that extend Medusa's functionality.

**Example**: Meilisearch Module

```typescript
// src/modules/meilisearch/service.ts
import { MedusaError } from "@medusajs/framework/utils"

type MeilisearchOptions = {
  host: string;
  apiKey: string;
  productIndexName: string;
}

export type MeilisearchIndexType = "product" | "content"

export default class MeilisearchModuleService {
  private client: typeof import("meilisearch").default
  private options: MeilisearchOptions

  constructor({}, options: MeilisearchOptions) {
    if (!options.host || !options.apiKey || !options.productIndexName) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "Meilisearch options are required"
      )
    }

    const { Meilisearch } = require("meilisearch")
    this.client = new Meilisearch({
      host: options.host,
      apiKey: options.apiKey,
    })
    this.options = options
  }

  async getIndexName(type: MeilisearchIndexType) {
    switch (type) {
      case "product":
        return this.options.productIndexName
      default:
        throw new Error(`Invalid index type: ${type}`)
    }
  }

  async indexData(
    data: Record<string, unknown>[],
    type: MeilisearchIndexType = "product"
  ) {
    const indexName = await this.getIndexName(type)
    const index = this.client.index(indexName)

    const documents = data.map((item) => ({
      ...item,
      id: item.id,
    }))

    await index.addDocuments(documents)
  }

  async deleteFromIndex(
    documentIds: string[],
    type: MeilisearchIndexType = "product"
  ) {
    const indexName = await this.getIndexName(type)
    const index = this.client.index(indexName)

    await index.deleteDocuments(documentIds)
  }
}
```

Module definition:

```typescript
// src/modules/meilisearch/index.ts
import { Module } from "@medusajs/framework/utils"
import MeilisearchModuleService from "./service"

export const MEILISEARCH_MODULE = "meilisearch"

export default Module(MEILISEARCH_MODULE, {
  service: MeilisearchModuleService,
})
```

Register in `medusa-config.ts`:

```typescript
module.exports = defineConfig({
  // ...
  modules: [
    {
      resolve: "./src/modules/meilisearch",
      options: {
        host: process.env.MEILISEARCH_HOST!,
        apiKey: process.env.MEILISEARCH_API_KEY!,
        productIndexName: process.env.MEILISEARCH_PRODUCT_INDEX_NAME!,
      },
    },
  ],
})
```

### 3. Subscribers (Event Handlers)

Subscribers listen to events and perform actions.

**Example**: Product Indexing Subscriber

```typescript
// src/subscribers/product-index.ts
import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"

export default async function productIndexer({
  data,
  container,
}: SubscriberArgs<{ id: string }>) {
  const { id: productId } = data

  // 1. Resolve Services
  const productModule = container.resolve(Modules.PRODUCT)
  const strapi = container.resolve("strapi") // From loader
  const meilisearchModule = container.resolve(MEILISEARCH_MODULE)
  const logger = container.resolve("logger")

  // 2. Fetch Product from Medusa
  const [product] = await productModule.listProducts({
    filters: { id: productId },
    relations: ["variants", "images", "categories"],
  })

  if (!product) {
    logger.warn(`Product ${productId} not found`)
    return
  }

  // 3. Fetch Content from Strapi (non-blocking)
  let richDescription = ""
  let productStory = ""

  try {
    const cmsData = await strapi.find("product-descriptions", {
      filters: { medusa_id: productId },
    })

    if (cmsData?.data?.[0]) {
      richDescription = cmsData.data[0].rich_text || ""
      productStory = cmsData.data[0].story || ""
    }
  } catch (e) {
    logger.warn(`Could not fetch Strapi content for ${productId}`)
    // Continue without Strapi content - non-blocking
  }

  // 4. Construct Search Document (THE MERGE)
  const document = {
    id: product.id,
    title: product.title,
    handle: product.handle,
    thumbnail: product.thumbnail,
    subtitle: product.subtitle,
    description: product.description,
    // Enriched from Strapi
    rich_description: richDescription,
    product_story: productStory,
    // Pricing
    price: product.variants?.[0]?.prices?.[0]?.amount || 0,
    currency_code: product.variants?.[0]?.prices?.[0]?.currency_code || "USD",
    // Variants for filtering
    variants: product.variants?.map((v) => ({
      id: v.id,
      title: v.title,
      options: v.options,
    })) || [],
    // Categories for faceting
    categories: product.categories?.map((c) => c.name) || [],
    // Images
    images: product.images?.map((img) => img.url) || [],
    // Metadata
    status: product.status,
    created_at: product.created_at,
    updated_at: product.updated_at,
  }

  // 5. Index to Meilisearch
  await meilisearchModule.indexData([document], "product")
  logger.info(`Indexed product ${productId} with enriched Strapi content`)
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}
```

### 4. Workflows (Multi-Step Operations)

Workflows orchestrate complex operations with automatic rollback.

**Example**: Sync Products Workflow

```typescript
// src/workflows/sync-products.ts
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { syncProductsStep } from "./steps/sync-products"

type SyncProductsWorkflowInput = {
  filters?: Record<string, unknown>
  limit?: number
  offset?: number
}

export const syncProductsWorkflow = createWorkflow(
  "sync-products",
  ({ filters, limit, offset }: SyncProductsWorkflowInput) => {
    syncProductsStep({ filters, limit, offset })

    return new WorkflowResponse({
      success: true,
    })
  }
)
```

---

## Implementation: Strapi Loader

### Step 1: Install Strapi Client

```bash
cd apps/backend
npm install @strapi/client
```

### Step 2: Create the Loader

```typescript
// src/loaders/strapi.ts
import { MedusaContainer } from "@medusajs/framework/types"
import StrapiClient from "@strapi/client"

export default async function strapiLoader(
  container: MedusaContainer
) {
  const strapiClient = new StrapiClient({
    url: process.env.STRAPI_URL || "http://localhost:1337",
    apiKey: process.env.STRAPI_API_KEY,
  })

  container.register("strapi", strapiClient)
}
```

### Step 3: Register in Config

```typescript
// medusa-config.ts
module.exports = defineConfig({
  // ...
  loaders: [
    {
      resolve: "./src/loaders/strapi.ts",
    },
  ],
})
```

### Environment Variables

```bash
# apps/backend/.env
STRAPI_URL=http://localhost:1337
STRAPI_API_KEY=your-strapi-api-key
```

---

## Implementation: Meilisearch Integration

> **RECOMMENDED**: Use the community plugin `@rokmo/medusa-plugin-meilisearch` for v2 compatibility. It's simpler and faster than building a custom module.

### Step 1: Install the Plugin (Recommended)

```bash
cd apps/backend
npm install @rokmo/medusa-plugin-meilisearch
```

### Step 2: Configure Plugin in medusa-config.ts

```typescript
// medusa-config.ts
module.exports = defineConfig({
  plugins: [
    {
      resolve: "@rokmo/medusa-plugin-meilisearch",
      options: {
        host: process.env.MEILISEARCH_HOST,
        apiKey: process.env.MEILISEARCH_API_KEY,
        settings: {
          // Index configuration
          filterableAttributes: ["price", "categories", "tags", "variants.options.value"],
          sortableAttributes: ["price", "title", "created_at"],
          searchableAttributes: ["title", "description", "rich_description"],
          displayedAttributes: ["id", "title", "handle", "thumbnail", "price", "rich_description"],
          rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
        },
      },
    },
  ],
})
```

### Alternative: Custom Module (Only if plugin doesn't meet needs)

> **Note**: Only build a custom module if the plugin doesn't support your specific requirements. For most use cases, the plugin is sufficient.

### Step 1: Install Meilisearch SDK

```bash
cd apps/backend
npm install meilisearch
```

### Step 2: Create Module Service

```typescript
// src/modules/meilisearch/service.ts
import { MedusaError } from "@medusajs/framework/utils"

type MeilisearchOptions = {
  host: string;
  apiKey: string;
  productIndexName: string;
  contentIndexName?: string;
}

export type MeilisearchIndexType = "product" | "content"

export default class MeilisearchModuleService {
  private client: any
  private options: MeilisearchOptions

  constructor({}, options: MeilisearchOptions) {
    if (!options.host || !options.apiKey || !options.productIndexName) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "Meilisearch options are required"
      )
    }

    const { Meilisearch } = require("meilisearch")
    this.client = new Meilisearch({
      host: options.host,
      apiKey: options.apiKey,
    })
    this.options = options
  }

  async getIndexName(type: MeilisearchIndexType): Promise<string> {
    switch (type) {
      case "product":
        return this.options.productIndexName
      case "content":
        return this.options.contentIndexName || "content"
      default:
        throw new Error(`Invalid index type: ${type}`)
    }
  }

  async indexData(
    data: Record<string, unknown>[],
    type: MeilisearchIndexType = "product"
  ): Promise<void> {
    const indexName = await this.getIndexName(type)
    const index = this.client.index(indexName)

    const documents = data.map((item) => ({
      ...item,
      id: item.id,
    }))

    await index.addDocuments(documents)
  }

  async deleteFromIndex(
    documentIds: string[],
    type: MeilisearchIndexType = "product"
  ): Promise<void> {
    const indexName = await this.getIndexName(type)
    const index = this.client.index(indexName)

    await index.deleteDocuments(documentIds)
  }

  async search(
    query: string,
    type: MeilisearchIndexType = "product",
    options?: Record<string, unknown>
  ): Promise<any> {
    const indexName = await this.getIndexName(type)
    const index = this.client.index(indexName)

    return await index.search(query, options)
  }

  async configureIndex(
    type: MeilisearchIndexType,
    settings: Record<string, unknown>
  ): Promise<void> {
    const indexName = await this.getIndexName(type)
    const index = this.client.index(indexName)

    // Update settings
    const updateTasks: Promise<void>[] = []

    if (settings.filterableAttributes) {
      updateTasks.push(
        index.updateFilterableAttributes(settings.filterableAttributes as string[])
      )
    }

    if (settings.sortableAttributes) {
      updateTasks.push(
        index.updateSortableAttributes(settings.sortableAttributes as string[])
      )
    }

    if (settings.searchableAttributes) {
      updateTasks.push(
        index.updateSearchableAttributes(settings.searchableAttributes as string[])
      )
    }

    await Promise.all(updateTasks)
  }
}
```

### Step 3: Create Module Definition

```typescript
// src/modules/meilisearch/index.ts
import { Module } from "@medusajs/framework/utils"
import MeilisearchModuleService from "./service"

export const MEILISEARCH_MODULE = "meilisearch"

export default Module(MEILISEARCH_MODULE, {
  service: MeilisearchModuleService,
})
```

### Step 4: Register Module in Config

```typescript
// medusa-config.ts
module.exports = defineConfig({
  // ...
  modules: [
    {
      resolve: "./src/modules/meilisearch",
      options: {
        host: process.env.MEILISEARCH_HOST!,
        apiKey: process.env.MEILISEARCH_API_KEY!,
        productIndexName: process.env.MEILISEARCH_PRODUCT_INDEX_NAME || "products",
        contentIndexName: process.env.MEILISEARCH_CONTENT_INDEX_NAME || "content",
      },
    },
  ],
})
```

### Environment Variables

```bash
# apps/backend/.env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-master-key
MEILISEARCH_PRODUCT_INDEX_NAME=products
MEILISEARCH_CONTENT_INDEX_NAME=content
```

---

## The Aggregator Workflow

### Complete Subscriber Implementation

This subscriber implements the "Medusa as Aggregator" pattern:

```typescript
// src/subscribers/product-index.ts
import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"

export default async function productIndexer({
  data,
  container,
}: SubscriberArgs<{ id: string }>) {
  const { id: productId } = data

  // Resolve Services
  const productModule = container.resolve(Modules.PRODUCT)
  const strapi = container.resolve("strapi") // From loader
  const meilisearchModule = container.resolve(MEILISEARCH_MODULE)
  const logger = container.resolve("logger")

  logger.info(`Indexing product ${productId}...`)

  // 1. Fetch Product from Medusa
  const [product] = await productModule.listProducts({
    filters: { id: productId },
    relations: ["variants", "images", "categories", "tags"],
  })

  if (!product) {
    logger.warn(`Product ${productId} not found`)
    return
  }

  // 2. Fetch Content from Strapi (non-blocking)
  let richDescription = ""
  let productStory = ""
  let seoTitle = ""
  let seoDescription = ""

  try {
    const cmsData = await strapi.find("product-descriptions", {
      filters: { medusa_id: productId },
      populate: ["*"],
    })

    if (cmsData?.data?.[0]?.attributes) {
      const attrs = cmsData.data[0].attributes
      richDescription = attrs.rich_text || ""
      productStory = attrs.story || ""
      seoTitle = attrs.seo_title || ""
      seoDescription = attrs.seo_description || ""
    }
  } catch (e) {
    logger.warn(`Could not fetch Strapi content for ${productId}: ${e.message}`)
    // Continue without Strapi content - non-blocking
  }

  // 3. Construct Search Document
  const document = {
    // Core Medusa fields
    id: product.id,
    title: product.title,
    handle: product.handle,
    subtitle: product.subtitle || "",
    description: product.description || "",
    thumbnail: product.thumbnail || "",

    // Enriched from Strapi
    rich_description: richDescription,
    product_story: productStory,
    seo_title: seoTitle || product.title,
    seo_description: seoDescription || product.description,

    // Pricing
    price: product.variants?.[0]?.prices?.[0]?.amount || 0,
    currency_code: product.variants?.[0]?.prices?.[0]?.currency_code || "USD",

    // Variants for filtering
    variants: product.variants?.map((v) => ({
      id: v.id,
      title: v.title,
      options: v.options,
      prices: v.prices,
    })) || [],

    // Categories for faceting
    categories: product.categories?.map((c) => c.name) || [],

    // Tags
    tags: product.tags?.map((t) => t.value) || [],

    // Images
    images: product.images?.map((img) => img.url) || [],

    // Metadata
    status: product.status,
    created_at: product.created_at,
    updated_at: product.updated_at,
  }

  // 4. Index to Meilisearch
  await meilisearchModule.indexData([document], "product")

  logger.info(`Successfully indexed product ${productId}`)
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}
```

### Delete Subscriber

```typescript
// src/subscribers/product-delete.ts
import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"

export default async function productDeleter({
  data,
  container,
}: SubscriberArgs<{ id: string }>) {
  const { id: productId } = data
  const logger = container.resolve("logger")

  logger.info(`Deleting product ${productId} from Meilisearch`)

  const meilisearchModule = container.resolve(MEILISEARCH_MODULE)
  await meilisearchModule.deleteFromIndex([productId], "product")

  logger.info(`Successfully deleted product ${productId} from index`)
}

export const config: SubscriberConfig = {
  event: "product.deleted",
}
```

### Manual Sync Subscriber

```typescript
// src/subscribers/meilisearch-sync.ts
import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { MEILISEARCH_MODULE } from "../modules/meilisearch"
import { syncProductsWorkflow } from "../workflows/sync-products"

export default async function meilisearchSyncHandler({
  container,
}: SubscriberArgs) {
  const logger = container.resolve("logger")

  let hasMore = true
  let offset = 0
  const limit = 50
  let totalIndexed = 0

  logger.info("Starting full product indexing...")

  while (hasMore) {
    const productModule = container.resolve(Modules.PRODUCT)
    const { data: products, metadata } = await productModule.listProducts({
      filters: { status: "published" },
      relations: ["variants", "images", "categories", "tags"],
      pagination: {
        take: limit,
        skip: offset,
      },
    })

    // Index each product with enrichment
    const meilisearchModule = container.resolve(MEILISEARCH_MODULE)
    const strapi = container.resolve("strapi")

    for (const product of products) {
      // Fetch Strapi content
      let richDescription = ""
      try {
        const cmsData = await strapi.find("product-descriptions", {
          filters: { medusa_id: product.id },
        })
        richDescription = cmsData?.data?.[0]?.attributes?.rich_text || ""
      } catch (e) {
        // Continue without enrichment
      }

      const document = {
        id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        rich_description: richDescription,
        // ... other fields
      }

      await meilisearchModule.indexData([document], "product")
    }

    totalIndexed += products.length
    hasMore = offset + limit < (metadata?.count || 0)
    offset += limit
  }

  logger.info(`Successfully indexed ${totalIndexed} products`)
}

export const config: SubscriberConfig = {
  event: "meilisearch.sync",
}
```

---

## Product Status Filtering

### Important: Dual Status System

The Meilisearch sync behavior is determined by **TWO independent status fields**:

1. **Medusa `product.status`** - Controls whether the product is indexed at all
2. **Strapi `productDescription` status** - Controls whether enrichment is included

### Complete Behavior Matrix

| Medusa Status | Strapi Status | Indexed? | With Enrichment? |
|---------------|---------------|----------|------------------|
| `published` | `published` | ✅ Yes | ✅ Yes (full content) |
| `published` | `draft` | ✅ Yes | ❌ No (Medusa data only) |
| `published` | (not found) | ✅ Yes | ❌ No (Medusa data only) |
| `draft` | Any | ❌ No | N/A |
| `proposed` | Any | ❌ No | N/A |
| `rejected` | Any | ❌ No | N/A |

### How Dual Status Filtering Works

#### Layer 1: Medusa Product Status (Primary Filter)

```typescript
// src/workflows/meilisearch/sync-all-products-to-meilisearch.ts:159
const { data: products } = useQueryGraphStep({
  entity: "product",
  filters: {
    status: "published", // Only fetch published products
  },
})
```

If Medusa status is NOT `published` → Product is **never synced** (deleted from index if previously indexed).

#### Layer 2: Strapi Content Status (Enrichment Filter)

```typescript
// src/modules/strapi/service.ts:192 - Strapi API defaults
// No publicationState specified → defaults to "live" (published only)

const response = await this.makeRequest(
  `product-descriptions?filters[medusa_product_id][$eq]=${medusaProductId}`
);
// Returns: [] if Strapi content is draft → null → no enrichment
```

Strapi v5 API defaults to `publicationState=live`, which means:
- If Strapi content is `published` → Returns content → Enrichment included
- If Strapi content is `draft` → Returns empty → No enrichment (product indexed with Medusa data only)

#### Layer 3: Webhook Triggers Re-sync

```typescript
// src/api/webhooks/strapi/route.ts
events: ["entry.publish", "entry.unpublish"]
```

- When Strapi content is **published** → Webhook fires → Re-indexes WITH enrichment
- When Strapi content is **unpublished** → Webhook fires → Re-indexes WITHOUT enrichment

### Why This Design?

1. **Content Independence**: Content teams can prepare descriptions in Strapi while products are in draft
2. **Progressive Enhancement**: Products are searchable with basic info even before rich content is ready
3. **Content Rollback**: Unpublishing Strapi content doesn't remove the product from search, just removes the enrichment

### Transform Logic Handling

```typescript
// src/modules/meilisearch/utils.ts:66-71
const richDescription = strapiContent?.rich_description || ""
const features = strapiContent?.features || []
const specifications = strapiContent?.specifications || {}

// When strapiContent is null (draft), uses fallback empty values
```

The transform function gracefully handles missing Strapi content by using fallback values.

### Testing Dual Status Behavior

```typescript
describe("Dual Status Filtering", () => {
  it("should index published product with published Strapi content", async () => {
    // Both published → full enrichment
    const product = { id: "prod_1", status: "published" }
    const strapiContent = { rich_description: "<p>Rich content</p>" }

    const doc = toMeilisearchDocument(product, strapiContent)
    expect(doc.rich_description).toBe("<p>Rich content</p>")
  })

  it("should index published product without Strapi enrichment when draft", async () => {
    // Medusa published, Strapi draft → index without enrichment
    const product = { id: "prod_1", status: "published" }
    const strapiContent = null // API returned empty (draft)

    const doc = toMeilisearchDocument(product, strapiContent)
    expect(doc.rich_description).toBeUndefined()
    // Product still indexed with Medusa data
    expect(doc.title).toBeDefined()
    expect(doc.price).toBeDefined()
  })

  it("should not index draft product even with published Strapi content", async () => {
    // Medusa draft → never indexed, regardless of Strapi status
    const product = { id: "prod_1", status: "draft" }
    await indexProduct(container, "prod_1")

    const results = await meilisearch.index("products").search("prod_1")
    expect(results.hits).toHaveLength(0)
  })
})
```

### Common Scenarios

| Scenario | What Happens |
|----------|--------------|
| **Product launch** | 1. Create product in Medusa (status=draft) → Not indexed<br>2. Prepare content in Strapi (status=draft) → No effect<br>3. Publish product in Medusa → Indexed with Medusa data only<br>4. Publish content in Strapi → Webhook fires → Re-indexed with enrichment |
| **Content update** | Edit in Strapi (draft) → Save → Publish → Webhook fires → Re-indexed with new content |
| **Content rollback** | Unpublish in Strapi → Webhook fires → Re-indexed WITHOUT enrichment (product still searchable) |
| **Product discontinuation** | Change Medusa status to draft → Deleted from Meilisearch |

---

## Next.js Storefront

### Search Client Setup

```typescript
// apps/storefront/lib/meilisearch/client.ts
import { Meilisearch as MeilisearchClient } from "meilisearch"

export const meilisearch = new MeilisearchClient({
  host: process.env.NEXT_PUBLIC_MEILISEARCH_HOST || "http://localhost:7700",
  apiKey: process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY || "",
})

export const PRODUCTS_INDEX = "products"
export const CONTENT_INDEX = "content"
```

### Search Hook with Parallel Fetching

```typescript
// apps/storefront/lib/hooks/use-search.ts
"use client"

import { useState, useCallback } from "react"
import { meilisearch, PRODUCTS_INDEX, CONTENT_INDEX } from "../meilisearch/client"

interface SearchResults {
  products: any[]
  content: any[]
  loading: boolean
  error: string | null
}

export function useSearch() {
  const [results, setResults] = useState<SearchResults>({
    products: [],
    content: [],
    loading: false,
    error: null,
  })

  const search = useCallback(async (query: string, options?: any) => {
    if (!query.trim()) {
      setResults({ products: [], content: [], loading: false, error: null })
      return
    }

    setResults((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // Parallel search across both indexes
      const [productsResult, contentResult] = await Promise.all([
        meilisearch.index(PRODUCTS_INDEX).search(query, {
          limit: options?.productLimit || 8,
          filter: options?.filters,
          sort: options?.sort,
        }),
        meilisearch.index(CONTENT_INDEX).search(query, {
          limit: options?.contentLimit || 3,
        }),
      ])

      setResults({
        products: productsResult.hits,
        content: contentResult.hits,
        loading: false,
        error: null,
      })
    } catch (error) {
      setResults({
        products: [],
        content: [],
        loading: false,
        error: error.message,
      })
    }
  }, [])

  return { ...results, search }
}
```

### Product Page with Storefront Composition

```typescript
// apps/storefront/app/(shop)/products/[handle]/page.tsx
import { notFound } from "next/navigation"
import { getProductByHandle } from "@/lib/medusa/products"
import { getStrapiContent } from "@/lib/strapi/content"
import { ProductTemplate } from "@/components/shop/product-template"

export default async function ProductPage({
  params,
}: {
  params: { handle: string };
}) {
  // ✅ RIGHT: Storefront Composition - Parallel Fetching
  const [product, strapiData] = await Promise.all([
    getProductByHandle(params.handle),
    getStrapiContent("product-description", {
      filters: { medusa_id: { $eq: null } },
    }),
  ])

  if (!product) {
    notFound()
  }

  // Match Strapi content by medusa_id
  const enrichedContent = strapiData?.data?.find(
    (item) => item.attributes.medusa_id === product.id
  )

  return (
    <ProductTemplate
      product={product}
      richDescription={enrichedContent?.attributes?.rich_text}
      productStory={enrichedContent?.attributes?.story}
    />
  )
}
```

---

## Environment Variables Summary

### Backend (.env)

```bash
# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-master-key
MEILISEARCH_PRODUCT_INDEX_NAME=products
MEILISEARCH_CONTENT_INDEX_NAME=content

# Strapi
STRAPI_URL=http://localhost:1337
STRAPI_API_KEY=your-strapi-api-key
```

### Storefront (.env.local)

```bash
# Meilisearch (search-only key)
NEXT_PUBLIC_MEILISEARCH_HOST=http://localhost:7700
NEXT_PUBLIC_MEILISEARCH_API_KEY=your-search-key

# Medusa
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000

# Strapi
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_READ_TOKEN=your-read-token
```

---

## Checklist for Success

### Strapi Setup
- [ ] Create "Product Description" collection with `medusa_id` field
- [ ] Add fields: `rich_text`, `story`, `seo_title`, `seo_description`
- [ ] Generate API token with read permissions

### Medusa Backend
- [ ] Create `src/loaders/strapi.ts`
- [ ] Create `src/modules/meilisearch/` (service.ts, index.ts)
- [ ] Create `src/subscribers/product-index.ts`
- [ ] Create `src/subscribers/product-delete.ts`
- [ ] Register loader in `medusa-config.ts`
- [ ] Register module in `medusa-config.ts`

### Next.js Storefront
- [ ] Install `meilisearch` package
- [ ] Create search client (`lib/meilisearch/client.ts`)
- [ ] Implement search hook or use `react-instantsearch`
- [ ] Update product page with parallel fetching pattern

---

## Summary: Key Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Loader** | Inject external services | `src/loaders/strapi.ts` → container.register |
| **Module** | Custom functionality | `src/modules/meilisearch/` → Module() |
| **Subscriber** | React to events | `src/subscribers/*.ts` → event handlers |
| **Workflow** | Multi-step operations | `src/workflows/*.ts` → createWorkflow() |

### Search vs Rendering

| Feature | Strategy | Why? |
|---------|-----------|------|
| **Search** | Medusa as Aggregator | Single fast index with enriched content |
| **Rendering** | Storefront Composition | Parallel fetching for fastest page load |
