import { toMeilisearchDocument } from "../product"
import type { SyncProductsStepProduct } from "@3dbyte-tech-store/shared-types"

describe("toMeilisearchDocument", () => {
	const mockProduct: SyncProductsStepProduct = {
		id: "prod_123",
		title: "Test Product",
		handle: "test-product",
		status: "published",
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-01T00:00:00Z",
		variants: [
			{
				id: "variant_1",
				prices: [{ amount: 1000, currency_code: "usd" }],
			},
		],
		brand: {
			id: "brand_123",
			name: "Test Brand",
			handle: "test-brand",
		},
	}

	it("should include brand object in the Meilisearch document", () => {
		const result = toMeilisearchDocument(mockProduct)

		expect(result).toHaveProperty("brand")
		expect(result.brand).toEqual({
			id: "brand_123",
			name: "Test Brand",
			handle: "test-brand",
		})
	})

	it("should handle product without brand", () => {
		const productWithoutBrand = { ...mockProduct, brand: null }
		const result = toMeilisearchDocument(productWithoutBrand)

		expect(result.brand).toBeUndefined()
	})
})
