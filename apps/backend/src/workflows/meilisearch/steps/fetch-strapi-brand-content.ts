import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STRAPI_MODULE } from "../../../modules/strapi"
import type StrapiModuleService from "../../../modules/strapi/service"
import type {
	SyncBrandsStepBrand,
	StrapiBrandDescription,
} from "@3dbyte-tech-store/shared-types"
import type { Logger } from "@medusajs/framework/types"

export type FetchStrapiBrandContentStepInput = {
	brands: SyncBrandsStepBrand[]
}

export const fetchStrapiBrandContentStep = createStep(
	"fetch-strapi-brand-content-step",
	async ({ brands }: FetchStrapiBrandContentStepInput, { container }) => {
		const strapiModuleService =
			container.resolve<StrapiModuleService>(STRAPI_MODULE)
		const logger = container.resolve<Logger>("logger")

		const brandIds = brands.map((b) => b.id)

		if (brandIds.length === 0) {
			return new StepResponse<StrapiBrandDescription[]>([])
		}

		try {
			// Fetch all brand descriptions from Strapi in parallel
			const descriptions = await Promise.allSettled(
				brandIds.map((id) =>
					strapiModuleService
						.getBrandDescription(id)
						.catch(() => null) // Return null if individual fetch fails
				)
			)

			// Filter out failed/missing descriptions
			const validDescriptions = descriptions
				.filter(
					(
						result
					): result is PromiseFulfilledResult<StrapiBrandDescription> =>
						result.status === "fulfilled" && result.value !== null
				)
				.map((result) => result.value)

			if (validDescriptions.length > 0) {
				logger.info(
					`Fetched ${validDescriptions.length} Strapi descriptions for ${brandIds.length} brands`
				)
			}

			return new StepResponse<StrapiBrandDescription[]>(validDescriptions)
		} catch (error) {
			// If Strapi is completely unavailable, continue without enrichment
			const message = error instanceof Error ? error.message : "Unknown error"
			logger.warn(
				`Strapi unavailable during Meilisearch brand sync: ${message}, continuing without enrichment`
			)
			return new StepResponse<StrapiBrandDescription[]>([])
		}
	}
)
