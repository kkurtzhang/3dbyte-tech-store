import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STRAPI_MODULE } from "../../../../modules/strapi"
import type StrapiModuleService from "../../../../modules/strapi/service"

export type DeleteFromStrapiStepInput = {
	brandId: string
}

type DeleteFromStrapiStepCompensationData = {
	brandId: string
	previousData: {
		name: string
		handle: string
	} | null
}

/**
 * Step to delete brand data from Strapi CMS.
 * Used when a brand is deleted from Medusa.
 *
 * Recommended config: { maxRetries: 3, retryInterval: 10 }
 */
export const deleteFromStrapiStep = createStep(
	"delete-from-strapi-step",
	async ({ brandId }: DeleteFromStrapiStepInput, { container }) => {
		const strapiService =
			container.resolve<StrapiModuleService>(STRAPI_MODULE)
		const logger = container.resolve("logger")

		// Get existing brand data before deletion (for potential rollback)
		const existingBrand = await strapiService.findBrandDescription(brandId)
		const previousData = existingBrand
			? {
					name: existingBrand.brand_name,
					handle: existingBrand.brand_handle,
				}
			: null

		// Delete from Strapi
		await strapiService.deleteBrandDescription(brandId)
		logger.info(`Deleted brand ${brandId} from Strapi`)

		return new StepResponse(
			{ deleted: true, brandId },
			{ brandId, previousData }
		)
	},
	// Compensation function for rollback
	async (compensationData, { container }) => {
		if (!compensationData) {
			return
		}

		const { brandId, previousData } =
			compensationData as DeleteFromStrapiStepCompensationData

		if (!previousData) {
			// Nothing to restore
			return
		}

		const strapiService =
			container.resolve<StrapiModuleService>(STRAPI_MODULE)
		const logger = container.resolve("logger")

		// Re-create the brand in Strapi
		await strapiService.createBrandDescription({
			id: brandId,
			name: previousData.name,
			handle: previousData.handle,
		})
		logger.info(`Compensation: Re-created brand ${brandId} in Strapi`)
	}
)
