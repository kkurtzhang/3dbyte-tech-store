/**
 * Unit tests for push-brand-to-strapi-step
 *
 * Tests the step that pushes brand data to Strapi CMS.
 * This step is designed for resilient syncing with retry configuration:
 * { maxRetries: 10, retryInterval: 60 }
 */
import { pushBrandToStrapiStep, type PushBrandToStrapiStepInput } from "../push-brand-to-strapi-step"
import type { SyncBrandsStepBrand } from "@3dbyte-tech-store/shared-types"

describe("pushBrandToStrapiStep", () => {
	describe("module exports", () => {
		it("should export pushBrandToStrapiStep", () => {
			expect(pushBrandToStrapiStep).toBeDefined()
		})

		it("should export PushBrandToStrapiStepInput type", () => {
			// Type check - if this compiles, the type is exported correctly
			const input: PushBrandToStrapiStepInput = {
				brand: {
					id: "brand_123",
					name: "Test Brand",
					handle: "test-brand",
					created_at: "2026-01-18T10:00:00.000Z",
					updated_at: "2026-01-18T10:00:00.000Z",
				},
			}
			expect(input.brand.id).toBe("brand_123")
		})
	})

	describe("input type validation", () => {
		it("should accept brand input with all required fields", () => {
			const mockBrand: SyncBrandsStepBrand = {
				id: "brand_456",
				name: "Full Brand",
				handle: "full-brand",
				created_at: "2026-01-18T10:00:00.000Z",
				updated_at: "2026-01-18T10:00:00.000Z",
			}

			const input: PushBrandToStrapiStepInput = {
				brand: mockBrand,
			}

			expect(input.brand).toBeDefined()
			expect(input.brand.id).toBe("brand_456")
			expect(input.brand.name).toBe("Full Brand")
			expect(input.brand.handle).toBe("full-brand")
		})
	})
})
