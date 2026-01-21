/**
 * Unit tests for delete-brand-workflow
 *
 * Tests the workflow that deletes brand data from Meilisearch and Strapi.
 * This workflow is triggered on brand.deleted events.
 *
 * Steps:
 * 1. Delete from Meilisearch (immediate)
 * 2. Delete from Strapi (background)
 */
import {
	deleteBrandWorkflow,
	type DeleteBrandWorkflowInput,
} from "../delete-brand-workflow"

describe("deleteBrandWorkflow", () => {
	describe("module exports", () => {
		it("should export deleteBrandWorkflow", () => {
			expect(deleteBrandWorkflow).toBeDefined()
		})

		it("should export DeleteBrandWorkflowInput type", () => {
			const input: DeleteBrandWorkflowInput = {
				brandId: "brand_123",
			}

			expect(input.brandId).toBe("brand_123")
		})
	})

	describe("workflow structure", () => {
		it("should have the correct workflow name", () => {
			expect(deleteBrandWorkflow.getName()).toBe("delete-brand-workflow")
		})
	})
})
