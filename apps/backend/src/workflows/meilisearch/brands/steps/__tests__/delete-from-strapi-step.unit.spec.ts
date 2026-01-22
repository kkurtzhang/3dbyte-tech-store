/**
 * Unit tests for delete-from-strapi-step
 *
 * Tests the step that deletes brand data from Strapi CMS.
 * This step is used when a brand is deleted from Medusa.
 */
import { deleteFromStrapiStep, type DeleteFromStrapiStepInput } from "../delete-from-strapi-step"

describe("deleteFromStrapiStep", () => {
	describe("module exports", () => {
		it("should export deleteFromStrapiStep", () => {
			expect(deleteFromStrapiStep).toBeDefined()
		})

		it("should export DeleteFromStrapiStepInput type", () => {
			// Type check - if this compiles, the type is exported correctly
			const input: DeleteFromStrapiStepInput = {
				brandId: "brand_123",
			}
			expect(input.brandId).toBe("brand_123")
		})
	})

	describe("input type validation", () => {
		it("should accept brandId input", () => {
			const input: DeleteFromStrapiStepInput = {
				brandId: "brand_456",
			}

			expect(input.brandId).toBe("brand_456")
		})
	})
})
