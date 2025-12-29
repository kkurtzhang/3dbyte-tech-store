import { Logger } from "@medusajs/framework/types"
import {
	MeilisearchIndexSettings,
	MeilisearchIndexType,
	MeilisearchModuleConfig,
	MeilisearchProductDocument,
	MeilisearchSearchResponse,
	MeilisearchSearchOptions,
} from "@3dbyte-tech-store/shared-types"

type InjectedDependencies = {
	logger: Logger
}

const MEILISEARCH_PRODUCT_INDEX = "products"

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
	private client: any // Meilisearch client
	protected logger_: Logger
	private config_: Omit<MeilisearchModuleConfig, "settings">

	constructor(
		{ logger }: InjectedDependencies,
		options: Omit<MeilisearchModuleConfig, "settings">
	) {
		this.logger_ = logger

		if (!options.host || !options.apiKey) {
			this.logger_.warn(
				"Meilisearch host or API key not configured. Meilisearch integration will be disabled."
			)
			this.config_ = {
				host: options.host || "",
				apiKey: options.apiKey || "",
				productIndexName: options.productIndexName || MEILISEARCH_PRODUCT_INDEX,
			}
			return
		}

		this.config_ = options

		try {
			// Dynamic import of meilisearch
			const { Meilisearch } = require("meilisearch")
			this.client = new Meilisearch({
				host: this.config_.host,
				apiKey: this.config_.apiKey,
			})
			this.logger_.info(
				`Meilisearch client initialized for ${this.config_.host}`
			)
		} catch (error) {
			this.logger_.error(
				`Failed to initialize Meilisearch client: ${error.message}`
			)
			this.client = null
		}
	}

	/**
	 * Get the index name for a given index type
	 */
	async getIndexName(
		type: MeilisearchIndexType
	): Promise<string> {
		switch (type) {
			case "product":
				return this.config_.productIndexName || MEILISEARCH_PRODUCT_INDEX
			default:
				throw new Error(`Invalid index type: ${type}`)
		}
	}

	/**
	 * Get the Meilisearch index for a given type
	 */
	private async getIndex(type: MeilisearchIndexType) {
		if (!this.client) {
			throw new Error("Meilisearch client is not initialized")
		}

		const indexName = await this.getIndexName(type)
		return this.client.index(indexName)
	}

	/**
	 * Index documents into Meilisearch
	 *
	 * @param data - Array of documents to index
	 * @param type - Index type (currently only "product" supported)
	 */
	async indexData(
		data: Record<string, unknown>[],
		type: MeilisearchIndexType = "product"
	): Promise<void> {
		if (!this.client) {
			this.logger_.warn("Meilisearch client not initialized, skipping indexing")
			return
		}

		try {
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
			// Note: Task processing is asynchronous. The documents are queued
			// and will be indexed by Meilisearch in the background.
		} catch (error) {
			this.logger_.error(
				`Failed to index documents: ${error.message}`,
				error
			)
			throw error
		}
	}

	/**
	 * Delete documents from Meilisearch index
	 *
	 * @param documentIds - Array of document IDs to delete
	 * @param type - Index type
	 */
	async deleteFromIndex(
		documentIds: string[],
		type: MeilisearchIndexType = "product"
	): Promise<void> {
		if (!this.client) {
			this.logger_.warn("Meilisearch client not initialized, skipping deletion")
			return
		}

		try {
			const index = await this.getIndex(type)
			const task = await index.deleteDocuments(documentIds)
			this.logger_.info(
				`Deleted ${documentIds.length} documents from ${type} index (task: ${task.taskUid})`
			)
			// Note: Task processing is asynchronous. The documents are queued
			// and will be deleted by Meilisearch in the background.
		} catch (error) {
			this.logger_.error(
				`Failed to delete documents: ${error.message}`,
				error
			)
			throw error
		}
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
		if (!this.client) {
			throw new Error("Meilisearch client is not initialized")
		}

		try {
			const index = await this.getIndex(type)
			const searchParams: Record<string, unknown> = {
				limit: options?.limit || 20,
				offset: options?.offset || 0,
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
				estimatedTotalHits: results.estimatedTotalHits,
				limit: results.limit,
				offset: results.offset,
				processingTimeMs: results.processingTimeMs,
				query: results.query,
			}
		} catch (error) {
			this.logger_.error(`Failed to search: ${error.message}`, error)
			throw error
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
		if (!this.client) {
			this.logger_.warn("Meilisearch client not initialized, skipping configuration")
			return
		}

		try {
			const index = await this.getIndex(type)

			this.logger_.info(`Configuring ${type} index settings...`)

			// Apply settings sequentially
			const updateTasks: Promise<unknown>[] = []

			if (settings.filterableAttributes?.length > 0) {
				updateTasks.push(
					index.updateFilterableAttributes(settings.filterableAttributes)
				)
				this.logger_.info(
					`Set filterable attributes: ${settings.filterableAttributes.join(", ")}`
				)
			}

			if (settings.sortableAttributes?.length > 0) {
				updateTasks.push(
					index.updateSortableAttributes(settings.sortableAttributes)
				)
				this.logger_.info(
					`Set sortable attributes: ${settings.sortableAttributes.join(", ")}`
				)
			}

			if (settings.searchableAttributes?.length > 0) {
				updateTasks.push(
					index.updateSearchableAttributes(settings.searchableAttributes)
				)
				this.logger_.info(
					`Set searchable attributes: ${settings.searchableAttributes.join(", ")}`
				)
			}

			if (settings.displayedAttributes?.length > 0) {
				updateTasks.push(
					index.updateDisplayedAttributes(settings.displayedAttributes)
				)
				this.logger_.info(
					`Set displayed attributes: ${settings.displayedAttributes.join(", ")}`
				)
			}

			if (settings.rankingRules?.length > 0) {
				updateTasks.push(index.updateRankingRules(settings.rankingRules))
				this.logger_.info(
					`Set ranking rules: ${settings.rankingRules.join(", ")}`
				)
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

			// Wait for all settings to be applied
			await Promise.all(updateTasks)

			this.logger_.info(`${type} index configuration completed`)
		} catch (error) {
			this.logger_.error(
				`Failed to configure index: ${error.message}`,
				error
			)
			throw error
		}
	}

	/**
	 * Check if Meilisearch is healthy and accessible
	 */
	async healthCheck(): Promise<boolean> {
		if (!this.client) {
			return false
		}

		try {
			await this.client.health()
			return true
		} catch (error) {
			this.logger_.warn(`Meilisearch health check failed: ${error.message}`)
			return false
		}
	}

	/**
	 * Get index statistics
	 */
	async getIndexStats(type: MeilisearchIndexType = "product"): Promise<any> {
		if (!this.client) {
			throw new Error("Meilisearch client is not initialized")
		}

		try {
			const indexName = await this.getIndexName(type)
			return await this.client.index(indexName).getStats()
		} catch (error) {
			this.logger_.error(`Failed to get index stats: ${error.message}`, error)
			throw error
		}
	}
}
