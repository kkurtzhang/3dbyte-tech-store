import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STRAPI_MODULE } from "../../../modules/strapi"
import type StrapiModuleService from "../../../modules/strapi/service"
import type { SyncBrandsStepBrand } from "@3dbyte-tech-store/shared-types"

export type PushBrandToStrapiStepInput = {
	brand: SyncBrandsStepBrand
}

type PushBrandToStrapiStepCompensationData = {
	brandId: string
	wasNewlyCreated: boolean
}

/**
 * Step to push brand data to Strapi CMS.
 * Creates or updates the brand-description entry in Strapi.
 *
 * This step is designed for resilient syncing with high retry tolerance:
 * Recommended config: { maxRetries: 10, retryInterval: 60 }
 *
 * The step will:
 * - Check if brand exists in Strapi (by medusa_brand_id)
 * - If exists: PUT update with new name/handle
 * - If missing: POST create new entry
 */
export const pushBrandToStrapiStep = createStep(
	"push-brand-to-strapi-step",
	async ({ brand }: PushBrandToStrapiStepInput, { container }) => {
		const strapiService =
			container.resolve<StrapiModuleService>(STRAPI_MODULE)
		const logger = container.resolve("logger")

		// Check if brand already exists in Strapi
		const existingBrand = await strapiService.findBrandDescription(brand.id)
		const wasNewlyCreated = !existingBrand

		// Create or update brand in Strapi
		const brandData = {
			id: brand.id,
			name: brand.name,
			handle: brand.handle,
		}

		let result
		if (existingBrand) {
			result = await strapiService.updateBrandDescription(brandData)
			logger.info(`Updated brand ${brand.id} in Strapi`)
		} else {
			result = await strapiService.createBrandDescription(brandData)
			logger.info(`Created brand ${brand.id} in Strapi`)
		}

		return new StepResponse(
			{ synced: true, brandId: brand.id, strapiDocumentId: result?.documentId },
			{ brandId: brand.id, wasNewlyCreated }
		)
	},
	// Compensation function for rollback
	async (compensationData, { container }) => {
		if (!compensationData) {
			return
		}

		const { brandId, wasNewlyCreated } =
			compensationData as PushBrandToStrapiStepCompensationData

		const strapiService =
			container.resolve<StrapiModuleService>(STRAPI_MODULE)
		const logger = container.resolve("logger")

		if (wasNewlyCreated) {
			// Delete the newly created brand from Strapi
			await strapiService.deleteBrandDescription(brandId)
			logger.info(`Compensation: Deleted brand ${brandId} from Strapi`)
		}
		// If it was an update, we don't have the previous state to restore
		// This is acceptable as the brand data should match Medusa anyway
	}
)
