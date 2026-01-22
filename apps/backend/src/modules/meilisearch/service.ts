import { MedusaError } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import type {
	MeilisearchIndexSettings,
	MeilisearchIndexType,
	MeilisearchModuleConfig,
	MeilisearchProductDocument,
	MeilisearchSearchResponse,
	MeilisearchSearchOptions,
	MeilisearchIndexStats,
} from "@3dbyte-tech-store/shared-types"

/**
 * Meilisearch SDK types (manually defined to avoid ESM/CJS import issues)
 * These match the types from meilisearch v0.54.0+
 */
interface MeiliSearchClient {
	index(indexName: string): MeiliSearchIndex
	health(): Promise<{ status: string }>
}

interface MeiliSearchIndex {
	addDocuments(documents: Record<string, unknown>[]): Promise<MeiliSearchEnqueuedTask>
	deleteDocuments(documentIds: string[]): Promise<MeiliSearchEnqueuedTask>
	getDocument(documentId: string): Promise<Record<string, unknown>>
	search(query: string, options?: Record<string, unknown>): Promise<MeiliSearchSearchResponse>
	getStats(): Promise<{ numberOfDocuments: number; isIndexing: boolean; fieldDistribution: Record<string, number> }>
	updateFilterableAttributes(attributes: string[]): Promise<MeiliSearchEnqueuedTask>
	updateSortableAttributes(attributes: string[]): Promise<MeiliSearchEnqueuedTask>
	updateSearchableAttributes(attributes: string[]): Promise<MeiliSearchEnqueuedTask>
	updateDisplayedAttributes(attributes: string[]): Promise<MeiliSearchEnqueuedTask>
	updateRankingRules(rules: string[]): Promise<MeiliSearchEnqueuedTask>
	updateTypoTolerance(settings: unknown): Promise<MeiliSearchEnqueuedTask>
	updateFaceting(settings: unknown): Promise<MeiliSearchEnqueuedTask>
	updatePagination(settings: unknown): Promise<MeiliSearchEnqueuedTask>
}

interface MeiliSearchEnqueuedTask {
	taskUid: number
	indexUid: string
	status: string
	type: string
	enqueuedAt: string
}

interface MeiliSearchSearchResponse {
	hits: Record<string, unknown>[]
	estimatedTotalHits?: number
	limit: number
	offset: number
	processingTimeMs: number
	query: string
}

type InjectedDependencies = {
	logger: Logger
}

export type MeilisearchOptions = Omit<MeilisearchModuleConfig, "settings">

/**
 * Meilisearch Module Service
 *
 * Provides indexing and search functionality for Medusa products using Meilisearch.
 * Products are enriched with Strapi content before indexing.
 *
 * IMPORTANT: Task Processing (v0.54.0)
 * ======================================
 *
 * Meilisearch processes indexing tasks asynchronously. The addDocuments/deleteDocuments
 * methods return a task object, but the actual processing happens in the background.
 *
 * This implementation does NOT wait for tasks to complete, which is the recommended
 * approach for production:
 * - Faster response times (no blocking on task completion)
 * - Meilisearch handles task queuing automatically
 * - Documents appear in search within milliseconds
 *
 * If you need to ensure immediate consistency (e.g., for tests), use:
 *   await client.waitForTask(task.taskUid)
 */
export default class MeilisearchModuleService {
	private client: MeiliSearchClient
	protected logger_: Logger
	private options_: MeilisearchOptions

	constructor(
		{ logger }: InjectedDependencies,
		options: MeilisearchOptions
	) {
		this.logger_ = logger

		// Official pattern: throw MedusaError for invalid configuration
		if (!options.host || !options.apiKey || !options.productIndexName || !options.categoryIndexName || !options.brandIndexName) {
			throw new MedusaError(
				MedusaError.Types.INVALID_ARGUMENT,
				"Meilisearch options are required (host, apiKey, productIndexName, categoryIndexName, brandIndexName)"
			)
		}

		this.options_ = options
		// Use require for ESM module in CommonJS context
		const { MeiliSearch } = require("meilisearch")
		this.client = new MeiliSearch({
			host: options.host,
			apiKey: options.apiKey,
		})

		this.logger_.info(`Meilisearch client initialized for ${options.host}`)
	}

	async getIndexName(type: MeilisearchIndexType): Promise<string> {
		switch (type) {
			case "product":
				return this.options_.productIndexName
			case "category":
				return this.options_.categoryIndexName
			case "brand":
				return this.options_.brandIndexName
			default:
				throw new MedusaError(
					MedusaError.Types.INVALID_ARGUMENT,
					`Invalid index type: ${type}`
				)
		}
	}

	private async getIndex(type: MeilisearchIndexType): Promise<MeiliSearchIndex> {
		const indexName = await this.getIndexName(type)
		return this.client.index(indexName)
	}

	async indexData(
		data: Record<string, unknown>[],
		type: MeilisearchIndexType = "product"
	): Promise<MeiliSearchEnqueuedTask> {
		const index = await this.getIndex(type)
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
	 * Used for compensation functions to backup data before modifications.
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
					return null
				}
			})
		)

		return results.filter((doc): doc is Record<string, unknown> => doc !== null)
	}

	async deleteFromIndex(
		documentIds: string[],
		type: MeilisearchIndexType = "product"
	): Promise<MeiliSearchEnqueuedTask> {
		const index = await this.getIndex(type)
		const task = await index.deleteDocuments(documentIds)

		this.logger_.info(
			`Deleted ${documentIds.length} documents from ${type} index (task: ${task.taskUid})`
		)

		return task
	}

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
			hits: results.hits as unknown as MeilisearchProductDocument[],
			estimatedTotalHits: results.estimatedTotalHits ?? 0,
			limit: results.limit,
			offset: results.offset,
			processingTimeMs: results.processingTimeMs,
			query: results.query,
		}
	}

	async configureIndex(
		settings: MeilisearchIndexSettings,
		type: MeilisearchIndexType = "product"
	): Promise<void> {
		const index = await this.getIndex(type)
		this.logger_.info(`Configuring ${type} index settings...`)

		const updateTasks: Promise<MeiliSearchEnqueuedTask>[] = []

		if (settings.filterableAttributes?.length) {
			updateTasks.push(index.updateFilterableAttributes(settings.filterableAttributes))
		}
		if (settings.sortableAttributes?.length) {
			updateTasks.push(index.updateSortableAttributes(settings.sortableAttributes))
		}
		if (settings.searchableAttributes?.length) {
			updateTasks.push(index.updateSearchableAttributes(settings.searchableAttributes))
		}
		if (settings.displayedAttributes?.length) {
			updateTasks.push(index.updateDisplayedAttributes(settings.displayedAttributes))
		}
		if (settings.rankingRules?.length) {
			updateTasks.push(index.updateRankingRules(settings.rankingRules))
		}
		if (settings.typoTolerance) {
			updateTasks.push(index.updateTypoTolerance(settings.typoTolerance))
		}
		if (settings.faceting) {
			updateTasks.push(index.updateFaceting(settings.faceting))
		}
		if (settings.pagination) {
			updateTasks.push(index.updatePagination(settings.pagination))
		}

		await Promise.all(updateTasks)
		this.logger_.info(`${type} index configuration completed`)
	}

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

/**
 * Category index settings for Meilisearch
 * Optimized for category browse pages and autocomplete
 */
export const CATEGORY_INDEX_SETTINGS: MeilisearchIndexSettings = {
	// 1. SEARCHABLE
	// Users search by Name ("Shoes") or Breadcrumb ("Men").
	// 'handle' is searchable in case someone searches by a URL slug they saw.
	searchableAttributes: ["name", "display_path", "handle"],

	// 2. FILTERABLE
	// Critical for the frontend to hide empty categories or build specific menus.
	filterableAttributes: [
		"id",
		"category_ids", // For filtering by multiple categories
		"parent_category_id", // Essential for "Get all sub-categories of X"
		"product_count", // Filter: "product_count > 0"
		"created_at", // Filter: "created_at > 170000..." (New categories)
	],

	// 3. SORTABLE
	// Categories are rarely sorted by date.
	// They are sorted by "Rank" (Manual order) or "Popularity" (Traffic).
	sortableAttributes: ["rank", "product_count", "name", "created_at"],

	// 4. RANKING RULES
	// This is the "Secret Sauce".
	// We modify the standard rules to prioritizing your 'rank' field above text relevance.
	rankingRules: [
		"words",
		"typo",
		"sort", // <--- Moved UP (Default is #5). Important!
		"proximity",
		"attribute",
		"exactness",
		"product_count:desc", // Boost categories with more products
	],

	// 5. DISPLAYED
	// Keep the payload light. Don't send internal flags.
	displayedAttributes: [
		"id",
		"name",
		"handle",
		"description",
		"display_path",
		"breadcrumb",     // For rich display: Link > Link > Link
		"product_count",
		"rank",
	],

	// 6. TYPO TOLERANCE
	// Optional: Prevent "shos" from matching "shoes" if you want strictness.
	// Usually, default is fine.
	typoTolerance: {
		minWordSizeForTypos: {
			oneTypo: 4,
			twoTypos: 8
		}
	},

	// 7. FACETING & PAGINATION
	faceting: {
		maxValuesPerFacet: 100,
	},
	pagination: {
		maxTotalHits: 10000,
	},
}
