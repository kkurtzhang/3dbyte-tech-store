/**
 * Unit tests for index-brand-step
 *
 * Since Medusa's createStep returns an opaque StepFunction that cannot be invoked directly,
 * we test the step's logic by:
 * 1. Testing the toBrandDocument transformer (already covered in brand.unit.spec.ts)
 * 2. Verifying the step exports correctly
 * 3. Testing step behavior through integration tests
 *
 * This file focuses on verifying the module structure and exports.
 * The actual step logic is tested via integration tests.
 */
import { indexBrandStep, type IndexBrandStepInput } from "../index-brand-step"
import type {
	SyncBrandsStepBrand,
	StrapiBrandDescription,
} from "@3dbyte-tech-store/shared-types"

describe("indexBrandStep", () => {
	describe("module exports", () => {
		it("should export indexBrandStep", () => {
			expect(indexBrandStep).toBeDefined()
		})

		it("should export IndexBrandStepInput type", () => {
			// Type check - if this compiles, the type is exported correctly
			const input: IndexBrandStepInput = {
				brand: {
					id: "brand_123",
					name: "Test Brand",
					handle: "test-brand",
					created_at: "2026-01-18T10:00:00.000Z",
					updated_at: "2026-01-18T10:00:00.000Z",
				},
				strapiPayload: null,
				productCount: 5,
			}
			expect(input.brand.id).toBe("brand_123")
		})
	})

	describe("input type validation", () => {
		it("should accept input with only required brand field", () => {
			const minimalInput: IndexBrandStepInput = {
				brand: {
					id: "brand_456",
					name: "Minimal Brand",
					handle: "minimal-brand",
					created_at: "2026-01-18T10:00:00.000Z",
					updated_at: "2026-01-18T10:00:00.000Z",
				},
			}
			expect(minimalInput.brand).toBeDefined()
			expect(minimalInput.strapiPayload).toBeUndefined()
			expect(minimalInput.productCount).toBeUndefined()
		})

		it("should accept input with all optional fields", () => {
			const mockBrand: SyncBrandsStepBrand = {
				id: "brand_789",
				name: "Full Brand",
				handle: "full-brand",
				created_at: "2026-01-18T10:00:00.000Z",
				updated_at: "2026-01-18T10:00:00.000Z",
			}

			const mockStrapiContent: StrapiBrandDescription = {
				documentId: "strapi_doc_1",
				medusa_brand_id: "brand_789",
				brand_name: "Full Brand",
				brand_handle: "full-brand",
				detailed_description: "A detailed description",
				brand_logo: [{ url: "https://example.com/logo.png" }],
				meta_keywords: ["tech", "innovation"],
				last_synced: "2026-01-18T10:00:00.000Z",
				sync_status: "synced",
				publishedAt: "2026-01-18T10:00:00.000Z",
			}

			const fullInput: IndexBrandStepInput = {
				brand: mockBrand,
				strapiPayload: mockStrapiContent,
				productCount: 42,
			}

			expect(fullInput.brand).toBeDefined()
			expect(fullInput.strapiPayload).toBeDefined()
			expect(fullInput.productCount).toBe(42)
		})
	})
})
