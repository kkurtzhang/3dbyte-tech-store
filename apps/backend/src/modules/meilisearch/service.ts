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

type InjectedDependencies = {
	logger: Logger
}

type MeilisearchOptions = Omit<MeilisearchModuleConfig, "settings">

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
	private client: any
	protected logger_: Logger
	private options_: MeilisearchOptions

	constructor(
		{ logger }: InjectedDependencies,
		options: MeilisearchOptions
	) {
		this.logger_ = logger

		// Official pattern: throw MedusaError for invalid configuration
		if (!options.host || !options.apiKey || !options.productIndexName || !options.categoryIndexName) {
			throw new MedusaError(
				MedusaError.Types.INVALID_ARGUMENT,
				"Meilisearch options are required (host, apiKey, productIndexName, categoryIndexName)"
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
			default:
				throw new MedusaError(
					MedusaError.Types.INVALID_ARGUMENT,
					`Invalid index type: ${type}`
				)
		}
	}

	private async getIndex(type: MeilisearchIndexType): Promise<any> {
		const indexName = await this.getIndexName(type)
		return this.client.index(indexName)
	}

	async indexData(
		data: Record<string, unknown>[],
		type: MeilisearchIndexType = "product"
	): Promise<any> {
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
	): Promise<any> {
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
			hits: results.hits as MeilisearchProductDocument[],
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

		const updateTasks: Promise<any>[] = []

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
	searchableAttributes: ["name", "parent_name", "handle"],

	// 2. FILTERABLE
	// Critical for the frontend to hide empty categories or build specific menus.
	filterableAttributes: [
		"id",
		"parent_category_id", // Essential for "Get all sub-categories of X"
		"product_count", // Filter: "product_count > 0"
		"path", // Filter: "path = 'Men'" (Matches hierarchy)
		"created_at", // Filter: "created_at > 170000..." (New categories)
	],

	// 3. SORTABLE
	// Categories are rarely sorted by date.
	// They are sorted by "Rank" (Manual order) or "Popularity" (Traffic).
	sortableAttributes: ["rank", "product_count", "created_at", "name"],

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
		"parent_name",
		"product_count",
		"path", // Useful for frontend breadcrumb generation
	],

	// 6. FACETING & PAGINATION
	faceting: {
		maxValuesPerFacet: 100,
	},
	pagination: {
		maxTotalHits: 10000,
	},
}
