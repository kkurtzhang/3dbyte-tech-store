/**
 * Unit tests for index-basic-brand-workflow
 *
 * Tests the workflow that indexes basic brand data to Meilisearch.
 * This workflow is triggered on brand.created and brand.updated events.
 * It indexes only basic data (id, name, handle) for immediate searchability.
 *
 * Retry config: { maxRetries: 3, retryInterval: 2 }
 */
import {
	indexBasicBrandWorkflow,
	type IndexBasicBrandWorkflowInput,
} from "../index-basic-brand-workflow"
import type { SyncBrandsStepBrand } from "@3dbyte-tech-store/shared-types"

describe("indexBasicBrandWorkflow", () => {
	describe("module exports", () => {
		it("should export indexBasicBrandWorkflow", () => {
			expect(indexBasicBrandWorkflow).toBeDefined()
		})

		it("should export IndexBasicBrandWorkflowInput type", () => {
			// Type check - if this compiles, the type is exported correctly
			const mockBrand: SyncBrandsStepBrand = {
				id: "brand_123",
				name: "Test Brand",
				handle: "test-brand",
				created_at: "2026-01-18T10:00:00.000Z",
				updated_at: "2026-01-18T10:00:00.000Z",
			}

			const input: IndexBasicBrandWorkflowInput = {
				brand: mockBrand,
			}

			expect(input.brand.id).toBe("brand_123")
		})
	})

	describe("workflow structure", () => {
		it("should have the correct workflow name", () => {
			expect(indexBasicBrandWorkflow.getName()).toBe("index-basic-brand-workflow")
		})
	})
})
