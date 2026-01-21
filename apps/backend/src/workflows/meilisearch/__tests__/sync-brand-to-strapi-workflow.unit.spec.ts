/**
 * Unit tests for sync-brand-to-strapi-workflow
 *
 * Tests the workflow that syncs brand data to Strapi CMS.
 * This workflow is triggered on brand.created and brand.updated events.
 * It pushes brand data (id, name, handle) to Strapi for content enrichment.
 *
 * Retry config: { maxRetries: 10, retryInterval: 60 }
 */
import {
	syncBrandToStrapiWorkflow,
	type SyncBrandToStrapiWorkflowInput,
} from "../sync-brand-to-strapi-workflow"
import type { SyncBrandsStepBrand } from "@3dbyte-tech-store/shared-types"

describe("syncBrandToStrapiWorkflow", () => {
	describe("module exports", () => {
		it("should export syncBrandToStrapiWorkflow", () => {
			expect(syncBrandToStrapiWorkflow).toBeDefined()
		})

		it("should export SyncBrandToStrapiWorkflowInput type", () => {
			const mockBrand: SyncBrandsStepBrand = {
				id: "brand_123",
				name: "Test Brand",
				handle: "test-brand",
				created_at: "2026-01-18T10:00:00.000Z",
				updated_at: "2026-01-18T10:00:00.000Z",
			}

			const input: SyncBrandToStrapiWorkflowInput = {
				brand: mockBrand,
			}

			expect(input.brand.id).toBe("brand_123")
		})
	})

	describe("workflow structure", () => {
		it("should have the correct workflow name", () => {
			expect(syncBrandToStrapiWorkflow.getName()).toBe("sync-brand-to-strapi-workflow")
		})
	})
})
