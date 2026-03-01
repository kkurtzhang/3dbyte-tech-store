# Meilisearch Integration - Official Standards Alignment

## Overview

This plan restructures the Meilisearch integration to strictly follow the official Medusa documentation patterns while preserving the Strapi enrichment feature.

**Reference:** https://docs.medusajs.com/resources/integrations/guides/meilisearch

## Goals

1. Eliminate all `any` types
2. Move Query usage from module helper to workflow steps
3. Add `transform` for data manipulation in workflows
4. Create separate step files following official naming
5. Add `retrieveFromIndex` method to service for compensation
6. Create `deleteProductsFromMeilisearchWorkflow`
7. Update subscribers to call workflows instead of helpers
8. Add `MedusaError` for invalid configuration

---

## File Changes Summary

### Files to DELETE
- `apps/backend/src/modules/meilisearch/helpers.ts`

### Files to CREATE
- `apps/backend/src/workflows/meilisearch/steps/sync-products.ts`
- `apps/backend/src/workflows/meilisearch/steps/delete-products-from-meilisearch.ts`
- `apps/backend/src/workflows/meilisearch/steps/fetch-strapi-content.ts`
- `apps/backend/src/workflows/meilisearch/sync-products.ts`
- `apps/backend/src/workflows/meilisearch/delete-products-from-meilisearch.ts`

### Files to MODIFY
- `apps/backend/src/modules/meilisearch/service.ts`
- `apps/backend/src/modules/meilisearch/utils.ts`
- `apps/backend/src/subscribers/meilisearch-product-index.ts`
- `apps/backend/src/subscribers/meilisearch-product-delete.ts`
- `apps/backend/src/api/admin/meilisearch/sync-products/route.ts`

### Files to DELETE (after migration)
- `apps/backend/src/workflows/meilisearch/sync-all-products-to-meilisearch.ts`

---

## Step 1: Add Types to shared-types Package

### File: `packages/shared-types/src/meilisearch.ts`

Add or verify these types exist:

```typescript
import type { MeiliSearch, Index, IndexStats, EnqueuedTask } from "meilisearch"

export type MeilisearchClient = MeiliSearch

export type MeilisearchIndexType = "product"

export interface MeilisearchModuleConfig {
  host: string
  apiKey: string
  productIndexName: string
  settings?: MeilisearchIndexSettings
}

export interface MeilisearchIndexSettings {
  filterableAttributes?: string[]
  sortableAttributes?: string[]
  searchableAttributes?: string[]
  displayedAttributes?: string[]
  rankingRules?: string[]
  typoTolerance?: {
    enabled: boolean
    minWordSizeForTypos?: {
      oneTypo?: number
      twoTypos?: number
    }
  }
  faceting?: {
    maxValuesPerFacet?: number
  }
  pagination?: {
    maxTotalHits?: number
  }
}

export interface MeilisearchProductDocument {
  id: string
  title: string
  handle: string
  subtitle?: string
  description?: string
  thumbnail?: string
  status: string
  price: number
  currency_code: string
  variants: Array<{
    id: string
    title: string
    options: Record<string, string>
    prices: Array<{
      amount: number
      currency_code: string
    }>
  }>
  categories: string[]
  tags: string[]
  images: string[]
  collection_ids: string[]
  type_ids: string[]
  material_ids: string[]
  detailed_description?: string
  features?: string[]
  specifications?: Record<string, string>
  seo_title?: string
  seo_description?: string
  meta_keywords?: string[]
  created_at: string
  updated_at: string
}

export interface MeilisearchSearchOptions {
  limit?: number
  offset?: number
  filter?: string | string[]
  sort?: string[]
  facets?: string[]
}

export interface MeilisearchSearchResponse {
  hits: MeilisearchProductDocument[]
  estimatedTotalHits: number
  limit: number
  offset: number
  processingTimeMs: number
  query: string
}

export interface MeilisearchIndexStats {
  numberOfDocuments: number
  isIndexing: boolean
  fieldDistribution: Record<string, number>
}

// Product type for workflow steps (matches useQueryGraphStep output)
export interface SyncProductsStepProduct {
  id: string
  title: string
  handle: string
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  status: string
  created_at: string
  updated_at: string
  variants?: Array<{
    id: string
    title?: string
    options?: Array<{
      option_title?: string
      title?: string
      value: string
    }>
    prices?: Array<{
      amount: number
      currency_code: string
    }>
    original_price?: number
    original_price_calculated?: number
  }>
  images?: Array<{
    url: string
  }>
  categories?: Array<{
    id: string
    name: string
    handle: string
  }>
  tags?: Array<{
    id: string
    value: string
  }>
  collection_id?: string
  type_id?: string
  material_id?: string
  currency_code?: string
}
```

---

## Step 2: Update Meilisearch Service

### File: `apps/backend/src/modules/meilisearch/service.ts`

**Changes:**
1. Replace `private client: any` with proper Meilisearch type
2. Add `retrieveFromIndex` method
3. Add `MedusaError` for invalid configuration
4. Fix `getIndexStats` return type
5. Remove graceful degradation (throw on invalid config per official docs)

```typescript
import { MedusaError } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { MeiliSearch, Index, EnqueuedTask, IndexStats } from "meilisearch"
import type {
  MeilisearchIndexSettings,
  MeilisearchIndexType,
  MeilisearchModuleConfig,
  MeilisearchProductDocument,
  MeilisearchSearchResponse,
  MeilisearchSearchOptions,
  MeilisearchIndexStats,
} from "@3dbyte-tech-store/shared-types"

type InjectedDependencies = {
  logger: Logger
}

type MeilisearchOptions = Omit<MeilisearchModuleConfig, "settings">

export default class MeilisearchModuleService {
  private client: MeiliSearch
  protected logger_: Logger
  private options_: MeilisearchOptions

  constructor(
    { logger }: InjectedDependencies,
    options: MeilisearchOptions
  ) {
    this.logger_ = logger

    // Official pattern: throw MedusaError for invalid configuration
    if (!options.host || !options.apiKey || !options.productIndexName) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "Meilisearch options are required (host, apiKey, productIndexName)"
      )
    }

    this.options_ = options
    this.client = new MeiliSearch({
      host: options.host,
      apiKey: options.apiKey,
    })

    this.logger_.info(`Meilisearch client initialized for ${options.host}`)
  }

  /**
   * Get the index name for a given index type
   */
  async getIndexName(type: MeilisearchIndexType): Promise<string> {
    switch (type) {
      case "product":
        return this.options_.productIndexName
      default:
        throw new MedusaError(
          MedusaError.Types.INVALID_ARGUMENT,
          `Invalid index type: ${type}`
        )
    }
  }

  /**
   * Get the Meilisearch index for a given type
   */
  private async getIndex(type: MeilisearchIndexType): Promise<Index> {
    const indexName = await this.getIndexName(type)
    return this.client.index(indexName)
  }

  /**
   * Index documents into Meilisearch
   *
   * @param data - Array of documents to index
   * @param type - Index type (currently only "product" supported)
   * @returns EnqueuedTask for tracking (async processing)
   */
  async indexData(
    data: Record<string, unknown>[],
    type: MeilisearchIndexType = "product"
  ): Promise<EnqueuedTask> {
    const index = await this.getIndex(type)

    // Transform data to ensure id is the primary key
    const documents = data.map((item) => ({
      ...item,
      id: item.id,
    }))

    const task = await index.addDocuments(documents)
    this.logger_.info(
      `Indexed ${documents.length} documents into ${type} index (task: ${task.taskUid})`
    )

    return task
  }

  /**
   * Retrieve documents from Meilisearch index by IDs
   *
   * Used for compensation functions to backup data before modifications.
   *
   * @param documentIds - Array of document IDs to retrieve
   * @param type - Index type
   * @returns Array of documents (excludes not-found documents)
   */
  async retrieveFromIndex(
    documentIds: string[],
    type: MeilisearchIndexType = "product"
  ): Promise<Record<string, unknown>[]> {
    const index = await this.getIndex(type)

    const results = await Promise.all(
      documentIds.map(async (id) => {
        try {
          return await index.getDocument(id)
        } catch (error) {
          // Document not found, return null
          return null
        }
      })
    )

    return results.filter((doc): doc is Record<string, unknown> => doc !== null)
  }

  /**
   * Delete documents from Meilisearch index
   *
   * @param documentIds - Array of document IDs to delete
   * @param type - Index type
   * @returns EnqueuedTask for tracking (async processing)
   */
  async deleteFromIndex(
    documentIds: string[],
    type: MeilisearchIndexType = "product"
  ): Promise<EnqueuedTask> {
    const index = await this.getIndex(type)
    const task = await index.deleteDocuments(documentIds)

    this.logger_.info(
      `Deleted ${documentIds.length} documents from ${type} index (task: ${task.taskUid})`
    )

    return task
  }

  /**
   * Search documents in Meilisearch
   *
   * @param query - Search query string
   * @param type - Index type
   * @param options - Search options (limit, offset, filters, etc.)
   */
  async search(
    query: string,
    type: MeilisearchIndexType = "product",
    options?: MeilisearchSearchOptions
  ): Promise<MeilisearchSearchResponse> {
    const index = await this.getIndex(type)
    const searchParams: Record<string, unknown> = {
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    }

    if (options?.filter) {
      searchParams.filter = options.filter
    }

    if (options?.sort) {
      searchParams.sort = options.sort
    }

    if (options?.facets) {
      searchParams.facets = options.facets
    }

    const results = await index.search(query, searchParams)

    return {
      hits: results.hits as MeilisearchProductDocument[],
      estimatedTotalHits: results.estimatedTotalHits ?? 0,
      limit: results.limit,
      offset: results.offset,
      processingTimeMs: results.processingTimeMs,
      query: results.query,
    }
  }

  /**
   * Configure index settings
   *
   * @param settings - Index settings to apply
   * @param type - Index type
   */
  async configureIndex(
    settings: MeilisearchIndexSettings,
    type: MeilisearchIndexType = "product"
  ): Promise<void> {
    const index = await this.getIndex(type)

    this.logger_.info(`Configuring ${type} index settings...`)

    const updateTasks: Promise<EnqueuedTask>[] = []

    if (settings.filterableAttributes && settings.filterableAttributes.length > 0) {
      updateTasks.push(index.updateFilterableAttributes(settings.filterableAttributes))
      this.logger_.info(`Set filterable attributes: ${settings.filterableAttributes.join(", ")}`)
    }

    if (settings.sortableAttributes && settings.sortableAttributes.length > 0) {
      updateTasks.push(index.updateSortableAttributes(settings.sortableAttributes))
      this.logger_.info(`Set sortable attributes: ${settings.sortableAttributes.join(", ")}`)
    }

    if (settings.searchableAttributes && settings.searchableAttributes.length > 0) {
      updateTasks.push(index.updateSearchableAttributes(settings.searchableAttributes))
      this.logger_.info(`Set searchable attributes: ${settings.searchableAttributes.join(", ")}`)
    }

    if (settings.displayedAttributes && settings.displayedAttributes.length > 0) {
      updateTasks.push(index.updateDisplayedAttributes(settings.displayedAttributes))
      this.logger_.info(`Set displayed attributes: ${settings.displayedAttributes.join(", ")}`)
    }

    if (settings.rankingRules && settings.rankingRules.length > 0) {
      updateTasks.push(index.updateRankingRules(settings.rankingRules))
      this.logger_.info(`Set ranking rules: ${settings.rankingRules.join(", ")}`)
    }

    if (settings.typoTolerance) {
      updateTasks.push(index.updateTypoTolerance(settings.typoTolerance))
      this.logger_.info("Set typo tolerance")
    }

    if (settings.faceting) {
      updateTasks.push(index.updateFaceting(settings.faceting))
      this.logger_.info("Set faceting settings")
    }

    if (settings.pagination) {
      updateTasks.push(index.updatePagination(settings.pagination))
      this.logger_.info("Set pagination settings")
    }

    await Promise.all(updateTasks)

    this.logger_.info(`${type} index configuration completed`)
  }

  /**
   * Check if Meilisearch is healthy and accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.health()
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      this.logger_.warn(`Meilisearch health check failed: ${message}`)
      return false
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(type: MeilisearchIndexType = "product"): Promise<MeilisearchIndexStats> {
    const index = await this.getIndex(type)
    const stats = await index.getStats()

    return {
      numberOfDocuments: stats.numberOfDocuments,
      isIndexing: stats.isIndexing,
      fieldDistribution: stats.fieldDistribution,
    }
  }
}
```

---

## Step 3: Update Utils (Fix Types)

### File: `apps/backend/src/modules/meilisearch/utils.ts`

**Changes:**
1. Replace `product: any` with proper typed interface
2. Keep the transformation logic

```typescript
import type {
  MeilisearchProductDocument,
  StrapiProductDescription,
  SyncProductsStepProduct,
} from "@3dbyte-tech-store/shared-types"

/**
 * Transform Medusa product and Strapi content into a Meilisearch document
 *
 * This function merges product data from Medusa with enriched content from Strapi,
 * creating a unified search document with all necessary fields for faceting and filtering.
 *
 * @param product - Medusa product with variants, images, categories, tags
 * @param strapiContent - Enriched content from Strapi (optional)
 * @returns Formatted Meilisearch document
 */
export function toMeilisearchDocument(
  product: SyncProductsStepProduct,
  strapiContent?: StrapiProductDescription | null
): MeilisearchProductDocument {
  // Extract pricing from first variant
  const firstVariant = product.variants?.[0]
  const price =
    firstVariant?.prices?.[0]?.amount ??
    firstVariant?.original_price ??
    firstVariant?.original_price_calculated ??
    0
  const currencyCode =
    firstVariant?.prices?.[0]?.currency_code ??
    product.currency_code ??
    "USD"

  // Extract categories as string array
  const categories = product.categories?.map((c) => c.name) ?? []

  // Extract tags as string array
  const tags = product.tags?.map((t) => t.value) ?? []

  // Extract images as string array
  const images = product.images?.map((img) => img.url) ?? []

  // Extract collection ID for faceting
  const collectionIds = product.collection_id ? [product.collection_id] : []

  // Extract type IDs for faceting
  const typeIds = product.type_id ? [product.type_id] : []

  // Extract material IDs for faceting
  const materialIds = product.material_id ? [product.material_id] : []

  // Build variants array with minimal data
  const variants = (product.variants ?? []).map((v) => ({
    id: v.id,
    title: v.title ?? v.options?.map((o) => o.value).join(" / ") ?? "",
    options: v.options?.reduce((acc: Record<string, string>, o) => {
      acc[o.option_title ?? o.title ?? "option"] = o.value
      return acc
    }, {}) ?? {},
    prices: v.prices ?? [],
  }))

  // Extract Strapi enriched content
  const detailedDescription = strapiContent?.detailed_description ?? ""
  const features = strapiContent?.features ?? []
  const specifications = strapiContent?.specifications ?? {}
  const seoTitle = strapiContent?.seo_title ?? product.title
  const seoDescription = strapiContent?.seo_description ?? product.description ?? ""
  const metaKeywords = strapiContent?.meta_keywords ?? []

  return {
    // Core Medusa fields
    id: product.id,
    title: product.title,
    handle: product.handle,
    subtitle: product.subtitle ?? undefined,
    description: product.description ?? undefined,
    thumbnail: product.thumbnail ?? undefined,
    status: product.status,

    // Pricing
    price,
    currency_code: currencyCode,

    // Variants
    variants,

    // Categories for faceting
    categories,

    // Tags
    tags,

    // Images
    images,

    // Collection IDs for faceting
    collection_ids: collectionIds,

    // Type IDs for faceting
    type_ids: typeIds,

    // Material IDs for faceting
    material_ids: materialIds,

    // Enriched from Strapi
    detailed_description: detailedDescription || undefined,
    features: features.length > 0 ? features : undefined,
    specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
    seo_title: seoTitle || undefined,
    seo_description: seoDescription || undefined,
    meta_keywords: metaKeywords.length > 0 ? metaKeywords : undefined,

    // Metadata
    created_at: product.created_at,
    updated_at: product.updated_at,
  }
}

/**
 * Default index settings for Meilisearch product index
 */
export const DEFAULT_INDEX_SETTINGS = {
  filterableAttributes: [
    "price",
    "categories",
    "tags",
    "status",
    "collection_ids",
    "type_ids",
    "material_ids",
  ],
  sortableAttributes: ["price", "title", "created_at", "updated_at"],
  searchableAttributes: [
    "title",
    "description",
    "detailed_description",
    "features",
    "tags",
    "categories",
  ],
  displayedAttributes: [
    "id",
    "title",
    "handle",
    "subtitle",
    "description",
    "thumbnail",
    "price",
    "currency_code",
    "categories",
    "tags",
    "images",
    "detailed_description",
    "features",
    "specifications",
    "status",
    "created_at",
    "updated_at",
  ],
  rankingRules: [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness",
    "created_at:desc",
  ],
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4,
      twoTypos: 8,
    },
  },
  faceting: {
    maxValuesPerFacet: 100,
  },
  pagination: {
    maxTotalHits: 10000,
  },
} as const
```

---

## Step 4: Create Workflow Steps

### File: `apps/backend/src/workflows/meilisearch/steps/sync-products.ts`

```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import { toMeilisearchDocument } from "../../../modules/meilisearch/utils"
import type MeilisearchModuleService from "../../../modules/meilisearch/service"
import type {
  SyncProductsStepProduct,
  StrapiProductDescription,
  MeilisearchProductDocument,
} from "@3dbyte-tech-store/shared-types"

export type SyncProductsStepInput = {
  products: SyncProductsStepProduct[]
  strapiContents?: StrapiProductDescription[]
}

type SyncProductsStepCompensationData = {
  newProductIds: string[]
  existingProducts: Record<string, unknown>[]
}

export const syncProductsStep = createStep(
  "sync-products",
  async (
    { products, strapiContents = [] }: SyncProductsStepInput,
    { container }
  ) => {
    const meilisearchModuleService =
      container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

    if (!products || products.length === 0) {
      return new StepResponse(
        { indexed: 0 },
        { newProductIds: [], existingProducts: [] }
      )
    }

    // Retrieve existing products BEFORE indexing (for rollback)
    const existingProducts = await meilisearchModuleService.retrieveFromIndex(
      products.map((product) => product.id),
      "product"
    )

    // Determine which products are new vs existing
    const existingIds = new Set(existingProducts.map((p) => p.id as string))
    const newProductIds = products
      .filter((product) => !existingIds.has(product.id))
      .map((product) => product.id)

    // Create a map of Strapi content by medusa_id for quick lookup
    const strapiContentMap = new Map<string, StrapiProductDescription>(
      strapiContents.map((content) => [content.medusa_product_id, content])
    )

    // Transform products to Meilisearch documents with Strapi enrichment
    const documents: MeilisearchProductDocument[] = products.map((product) => {
      const strapiContent = strapiContentMap.get(product.id)
      return toMeilisearchDocument(product, strapiContent ?? null)
    })

    // Index the documents
    await meilisearchModuleService.indexData(
      documents as unknown as Record<string, unknown>[],
      "product"
    )

    return new StepResponse(
      { indexed: documents.length },
      { newProductIds, existingProducts }
    )
  },
  // Compensation function for rollback
  async (compensationData, { container }) => {
    if (!compensationData) {
      return
    }

    const { newProductIds, existingProducts } =
      compensationData as SyncProductsStepCompensationData

    const meilisearchModuleService =
      container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

    // Delete newly added products
    if (newProductIds && newProductIds.length > 0) {
      await meilisearchModuleService.deleteFromIndex(newProductIds, "product")
    }

    // Restore existing products to their original state
    if (existingProducts && existingProducts.length > 0) {
      await meilisearchModuleService.indexData(existingProducts, "product")
    }
  }
)
```

### File: `apps/backend/src/workflows/meilisearch/steps/delete-products-from-meilisearch.ts`

```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import type MeilisearchModuleService from "../../../modules/meilisearch/service"

export type DeleteProductsFromMeilisearchStepInput = {
  ids: string[]
}

export const deleteProductsFromMeilisearchStep = createStep(
  "delete-products-from-meilisearch-step",
  async (
    { ids }: DeleteProductsFromMeilisearchStepInput,
    { container }
  ) => {
    const meilisearchModuleService =
      container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

    if (!ids || ids.length === 0) {
      return new StepResponse(undefined, [])
    }

    // Retrieve existing records BEFORE deletion (for rollback)
    const existingRecords = await meilisearchModuleService.retrieveFromIndex(
      ids,
      "product"
    )

    // Delete from Meilisearch
    await meilisearchModuleService.deleteFromIndex(ids, "product")

    return new StepResponse(undefined, existingRecords)
  },
  // Compensation: re-index if rollback needed
  async (existingRecords, { container }) => {
    if (!existingRecords || !Array.isArray(existingRecords) || existingRecords.length === 0) {
      return
    }

    const meilisearchModuleService =
      container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)

    await meilisearchModuleService.indexData(existingRecords, "product")
  }
)
```

### File: `apps/backend/src/workflows/meilisearch/steps/fetch-strapi-content.ts`

```typescript
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STRAPI_MODULE } from "../../../modules/strapi"
import type StrapiModuleService from "../../../modules/strapi/service"
import type {
  SyncProductsStepProduct,
  StrapiProductDescription,
} from "@3dbyte-tech-store/shared-types"
import type { Logger } from "@medusajs/framework/types"

export type FetchStrapiContentStepInput = {
  products: SyncProductsStepProduct[]
}

export const fetchStrapiContentStep = createStep(
  "fetch-strapi-content-step",
  async ({ products }: FetchStrapiContentStepInput, { container }) => {
    const strapiModuleService =
      container.resolve<StrapiModuleService>(STRAPI_MODULE)
    const logger = container.resolve<Logger>("logger")

    const productIds = products.map((p) => p.id)

    if (productIds.length === 0) {
      return new StepResponse<StrapiProductDescription[]>([])
    }

    try {
      // Fetch all product descriptions from Strapi in parallel
      const descriptions = await Promise.allSettled(
        productIds.map((id) =>
          strapiModuleService
            .getProductDescription(id)
            .catch(() => null) // Return null if individual fetch fails
        )
      )

      // Filter out failed/missing descriptions
      const validDescriptions = descriptions
        .filter(
          (result): result is PromiseFulfilledResult<StrapiProductDescription> =>
            result.status === "fulfilled" && result.value !== null
        )
        .map((result) => result.value)

      if (validDescriptions.length > 0) {
        logger.info(
          `Fetched ${validDescriptions.length} Strapi descriptions for ${productIds.length} products`
        )
      }

      return new StepResponse<StrapiProductDescription[]>(validDescriptions)
    } catch (error) {
      // If Strapi is completely unavailable, continue without enrichment
      const message = error instanceof Error ? error.message : "Unknown error"
      logger.warn(
        `Strapi unavailable during Meilisearch sync: ${message}, continuing without enrichment`
      )
      return new StepResponse<StrapiProductDescription[]>([])
    }
  }
)
```

---

## Step 5: Create Workflows

### File: `apps/backend/src/workflows/meilisearch/sync-products.ts`

```typescript
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { syncProductsStep, SyncProductsStepInput } from "./steps/sync-products"
import { deleteProductsFromMeilisearchStep } from "./steps/delete-products-from-meilisearch"
import { fetchStrapiContentStep } from "./steps/fetch-strapi-content"
import type { SyncProductsStepProduct } from "@3dbyte-tech-store/shared-types"

export type SyncProductsWorkflowInput = {
  filters?: Record<string, unknown>
  limit?: number
  offset?: number
}

export const syncProductsWorkflow = createWorkflow(
  "sync-products",
  ({ filters, limit, offset }: SyncProductsWorkflowInput) => {
    // Step 1: Fetch products from Medusa using useQueryGraphStep
    const { data: products, metadata } = useQueryGraphStep({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "subtitle",
        "description",
        "thumbnail",
        "status",
        "created_at",
        "updated_at",
        "collection_id",
        "type_id",
        "material_id",
        "currency_code",
        "variants.id",
        "variants.title",
        "variants.options.option_title",
        "variants.options.title",
        "variants.options.value",
        "variants.prices.amount",
        "variants.prices.currency_code",
        "variants.original_price",
        "variants.original_price_calculated",
        "images.url",
        "categories.id",
        "categories.name",
        "categories.handle",
        "tags.id",
        "tags.value",
      ],
      pagination: {
        take: limit,
        skip: offset,
      },
      filters,
    })

    // Step 2: Use transform to separate published vs unpublished products
    const { publishedProducts, unpublishedProductIds } = transform(
      { products },
      (data) => {
        const publishedProducts: SyncProductsStepInput["products"] = []
        const unpublishedProductIds: string[] = []

        ;(data.products as SyncProductsStepProduct[]).forEach((product) => {
          if (product.status === "published") {
            publishedProducts.push(product)
          } else {
            unpublishedProductIds.push(product.id)
          }
        })

        return { publishedProducts, unpublishedProductIds }
      }
    )

    // Step 3: Fetch Strapi content for enrichment (for published products only)
    const strapiContents = fetchStrapiContentStep({ products: publishedProducts })

    // Step 4: Sync published products to Meilisearch with Strapi enrichment
    const syncResult = syncProductsStep({
      products: publishedProducts,
      strapiContents,
    })

    // Step 5: Delete unpublished products from Meilisearch
    deleteProductsFromMeilisearchStep({
      ids: unpublishedProductIds,
    })

    return new WorkflowResponse({
      indexed: syncResult.indexed,
      products,
      metadata,
    })
  }
)
```

### File: `apps/backend/src/workflows/meilisearch/delete-products-from-meilisearch.ts`

```typescript
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { deleteProductsFromMeilisearchStep } from "./steps/delete-products-from-meilisearch"

export type DeleteProductsFromMeilisearchWorkflowInput = {
  ids: string[]
}

export const deleteProductsFromMeilisearchWorkflow = createWorkflow(
  "delete-products-from-meilisearch",
  (input: DeleteProductsFromMeilisearchWorkflowInput) => {
    deleteProductsFromMeilisearchStep(input)

    return new WorkflowResponse({ deleted: input.ids.length })
  }
)
```

---

## Step 6: Update Subscribers

### File: `apps/backend/src/subscribers/meilisearch-product-index.ts`

```typescript
import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework"
import { syncProductsWorkflow } from "../workflows/meilisearch/sync-products"

/**
 * Product Indexing Subscriber
 *
 * Listens to product.created and product.updated events:
 * - When product is created → Indexes to Meilisearch if published
 * - When product is updated → Indexes to Meilisearch if published, DELETES if not published
 * - When product status changes from published → Auto-removes from Meilisearch
 *
 * Uses syncProductsWorkflow following official Medusa patterns.
 */
export default async function productIndexer({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await syncProductsWorkflow(container).run({
    input: {
      filters: {
        id: data.id,
      },
    },
  })
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}
```

### File: `apps/backend/src/subscribers/meilisearch-product-delete.ts`

```typescript
import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework"
import { deleteProductsFromMeilisearchWorkflow } from "../workflows/meilisearch/delete-products-from-meilisearch"
import type { Logger } from "@medusajs/framework/types"

/**
 * Product Deletion Subscriber
 *
 * Listens to product.deleted events and removes the product from Meilisearch.
 * Uses deleteProductsFromMeilisearchWorkflow following official Medusa patterns.
 */
export default async function productDeleter({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve<Logger>("logger")

  logger.info(`Removing product ${data.id} from Meilisearch...`)

  try {
    await deleteProductsFromMeilisearchWorkflow(container).run({
      input: {
        ids: [data.id],
      },
    })

    logger.info(`Successfully removed product ${data.id} from Meilisearch`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.error(
      `Failed to remove product ${data.id} from Meilisearch: ${message}`,
      error
    )
    // Don't throw - product deletion should succeed even if search removal fails
  }
}

export const config: SubscriberConfig = {
  event: "product.deleted",
}
```

---

## Step 7: Update Admin API Route

### File: `apps/backend/src/api/admin/meilisearch/sync-products/route.ts`

```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { syncProductsWorkflow } from "../../../../workflows/meilisearch/sync-products"
import type { Logger } from "@medusajs/framework/types"

/**
 * POST /admin/meilisearch/sync-products
 *
 * Admin API endpoint to manually trigger a full sync of all products to Meilisearch.
 *
 * This endpoint will:
 * - Fetch all published products from Medusa
 * - Fetch enriched content from Strapi (if available)
 * - Index all products to Meilisearch
 * - Delete unpublished products from Meilisearch
 *
 * Example:
 * POST /admin/meilisearch/sync-products
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const logger = req.scope.resolve<Logger>("logger")

  try {
    logger.info("Starting manual Meilisearch sync...")

    let hasMore = true
    let offset = 0
    const limit = 50
    let totalIndexed = 0

    // Paginated sync following official pattern
    while (hasMore) {
      const { result } = await syncProductsWorkflow(req.scope).run({
        input: {
          limit,
          offset,
        },
      })

      hasMore = offset + limit < (result.metadata?.count ?? 0)
      offset += limit
      totalIndexed += result.indexed
    }

    logger.info(`Meilisearch sync completed: ${totalIndexed} products indexed`)

    res.json({
      message: "Products synced to Meilisearch successfully",
      indexed: totalIndexed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.error("Failed to sync products to Meilisearch:", error)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to sync products to Meilisearch: ${message}`
    )
  }
}

/**
 * GET /admin/meilisearch/sync-products
 *
 * Returns information about the sync endpoint (for discovery)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.json({
    endpoint: "/admin/meilisearch/sync-products",
    method: "POST",
    description: "Manually trigger a full sync of all products to Meilisearch",
    behavior: "Syncs all published products from Medusa to Meilisearch with Strapi enrichment",
    example: {
      request: "POST /admin/meilisearch/sync-products",
      response: {
        message: "Products synced to Meilisearch successfully",
        indexed: 150,
      },
    },
  })
}
```

---

## Step 8: Delete Old Files

After verifying everything works:

1. Delete: `apps/backend/src/modules/meilisearch/helpers.ts`
2. Delete: `apps/backend/src/workflows/meilisearch/sync-all-products-to-meilisearch.ts`

---

## Step 9: Update Strapi Webhook (if applicable)

If you have a Strapi webhook that calls the old helper, update it to use the workflow:

```typescript
// In webhook handler
import { syncProductsWorkflow } from "../../workflows/meilisearch/sync-products"

// Replace:
// await indexProduct(container, productId)

// With:
await syncProductsWorkflow(container).run({
  input: {
    filters: { id: productId },
  },
})
```

---

## Testing Checklist

After implementation:

1. [ ] Run TypeScript compilation: `pnpm --filter=@3dbyte-tech-store/backend build`
2. [ ] Start dev server: `pnpm --filter=@3dbyte-tech-store/backend dev`
3. [ ] Test manual sync via Admin UI
4. [ ] Test product create → verify indexed
5. [ ] Test product update → verify updated in index
6. [ ] Test product delete → verify removed from index
7. [ ] Test product unpublish → verify removed from index
8. [ ] Verify Strapi enrichment still works
9. [ ] Run existing tests

---

## Summary of Changes

| Category | Before | After |
|----------|--------|-------|
| Query location | Module helper | Workflow (useQueryGraphStep) |
| Data manipulation | Inside step | `transform` utility |
| Delete logic | Direct service call | Workflow with step |
| Compensation | Partial | Full with `retrieveFromIndex` |
| Types | Multiple `any` | Fully typed |
| Error handling | Warn + return | `MedusaError` |
| File structure | 1 workflow, 1 helper | 2 workflows, 3 steps |
