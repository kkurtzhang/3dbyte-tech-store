import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STRAPI_MODULE } from "../../../../modules/strapi"
import type StrapiModuleService from "../../../../modules/strapi/service"
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
					(
						result
					): result is PromiseFulfilledResult<StrapiProductDescription> =>
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
