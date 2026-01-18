import { toBrandDocument } from "../brand"
import type {
	MeilisearchBrandDocument,
	SyncBrandsStepBrand,
	StrapiBrandDescription,
} from "@3dbyte-tech-store/shared-types"

describe("toBrandDocument", () => {
	const mockBrand: SyncBrandsStepBrand = {
		id: "brand_123",
		name: "Test Brand",
		handle: "test-brand",
		created_at: "2024-01-15T10:30:00.000Z",
		updated_at: "2024-01-15T10:30:00.000Z",
	}

	const mockStrapiContent: StrapiBrandDescription = {
		documentId: "strapi_123",
		medusa_brand_id: "brand_123",
		brand_name: "Test Brand",
		brand_handle: "test-brand",
		detailed_description: "This is a detailed brand description from Strapi.",
		brand_logo: [
			{ url: "https://cdn.example.com/logo1.png" },
			{ url: "https://cdn.example.com/logo2.png" },
		],
		meta_keywords: ["electronics", "tech", "gadgets"],
		last_synced: "2024-01-15T10:30:00.000Z",
		sync_status: "synced",
	}

	describe("when transforming Medusa brand only", () => {
		it("should return basic Meilisearch document without Strapi enrichment", () => {
			// Arrange
			const strapiContent = null
			const productCount = 10

			// Act
			const result = toBrandDocument(mockBrand, strapiContent, productCount)

			// Assert
			const expected: MeilisearchBrandDocument = {
				id: "brand_123",
				name: "Test Brand",
				handle: "test-brand",
				detailed_description: undefined,
				brand_logo: undefined,
				meta_keywords: undefined,
				product_count: 10,
				created_at: expect.any(Number),
			}

			expect(result).toEqual(expected)
			expect(result.id).toBe("brand_123")
			expect(result.name).toBe("Test Brand")
			expect(result.handle).toBe("test-brand")
			expect(result.detailed_description).toBeUndefined()
			expect(result.brand_logo).toBeUndefined()
			expect(result.meta_keywords).toBeUndefined()
			expect(result.product_count).toBe(10)
			expect(result.created_at).toBeDefined()
		})

		it("should convert created_at to UNIX timestamp in milliseconds", () => {
			// Arrange
			const strapiContent = null
			const productCount = 5
			const expectedTimestamp = new Date(mockBrand.created_at).getTime()

			// Act
			const result = toBrandDocument(mockBrand, strapiContent, productCount)

			// Assert
			expect(result.created_at).toBe(expectedTimestamp)
			expect(result.created_at).toBeGreaterThan(0)
			expect(Number.isInteger(result.created_at)).toBe(true)
		})
	})

	describe("when transforming with full Strapi enrichment", () => {
		it("should include all Strapi content fields", () => {
			// Arrange
			const productCount = 25

			// Act
			const result = toBrandDocument(mockBrand, mockStrapiContent, productCount)

			// Assert
			expect(result).toEqual({
				id: "brand_123",
				name: "Test Brand",
				handle: "test-brand",
				detailed_description: "This is a detailed brand description from Strapi.",
				brand_logo: ["https://cdn.example.com/logo1.png", "https://cdn.example.com/logo2.png"],
				meta_keywords: ["electronics", "tech", "gadgets"],
				product_count: 25,
				created_at: expect.any(Number),
			})
		})

		it("should extract logo URLs from Strapi media objects", () => {
			// Arrange
			const productCount = 0

			// Act
			const result = toBrandDocument(mockBrand, mockStrapiContent, productCount)

			// Assert
			expect(result.brand_logo).toEqual([
				"https://cdn.example.com/logo1.png",
				"https://cdn.example.com/logo2.png",
			])
			expect(result.brand_logo).toHaveLength(2)
		})

		it("should include meta keywords from Strapi", () => {
			// Arrange
			const productCount = 0

			// Act
			const result = toBrandDocument(mockBrand, mockStrapiContent, productCount)

			// Assert
			expect(result.meta_keywords).toEqual(["electronics", "tech", "gadgets"])
			expect(result.meta_keywords).toHaveLength(3)
		})

		it("should include detailed description from Strapi", () => {
			// Arrange
			const productCount = 0

			// Act
			const result = toBrandDocument(mockBrand, mockStrapiContent, productCount)

			// Assert
			expect(result.detailed_description).toBe("This is a detailed brand description from Strapi.")
		})
	})

	describe("when handling empty arrays from Strapi", () => {
		it("should set brand_logo to undefined when array is empty", () => {
			// Arrange
			const emptyLogosContent: StrapiBrandDescription = {
				...mockStrapiContent,
				brand_logo: [],
			}
			const productCount = 0

			// Act
			const result = toBrandDocument(mockBrand, emptyLogosContent, productCount)

			// Assert
			expect(result.brand_logo).toBeUndefined()
		})

		it("should set meta_keywords to undefined when array is empty", () => {
			// Arrange
			const emptyKeywordsContent: StrapiBrandDescription = {
				...mockStrapiContent,
				meta_keywords: [],
			}
			const productCount = 0

			// Act
			const result = toBrandDocument(mockBrand, emptyKeywordsContent, productCount)

			// Assert
			expect(result.meta_keywords).toBeUndefined()
		})

		it("should handle both empty arrays simultaneously", () => {
			// Arrange
			const emptyContent: StrapiBrandDescription = {
				...mockStrapiContent,
				brand_logo: [],
				meta_keywords: [],
			}
			const productCount = 0

			// Act
			const result = toBrandDocument(mockBrand, emptyContent, productCount)

			// Assert
			expect(result.brand_logo).toBeUndefined()
			expect(result.meta_keywords).toBeUndefined()
		})
	})

	describe("when handling product count", () => {
		it("should correctly set product_count for various values", () => {
			// Arrange
			const testCases = [
				{ productCount: 0, expected: 0 },
				{ productCount: 1, expected: 1 },
				{ productCount: 100, expected: 100 },
				{ productCount: 9999, expected: 9999 },
			]

			testCases.forEach(({ productCount, expected }) => {
				// Act
				const result = toBrandDocument(mockBrand, null, productCount)

				// Assert
				expect(result.product_count).toBe(expected)
			})
		})
	})

	describe("when ensuring type safety", () => {
		it("should return object matching MeilisearchBrandDocument interface", () => {
			// Arrange
			const productCount = 15

			// Act
			const result = toBrandDocument(mockBrand, mockStrapiContent, productCount)

			// Assert - verify all required fields exist
			expect(result).toHaveProperty("id")
			expect(result).toHaveProperty("name")
			expect(result).toHaveProperty("handle")
			expect(result).toHaveProperty("product_count")
			expect(result).toHaveProperty("created_at")

			// Verify types
			expect(typeof result.id).toBe("string")
			expect(typeof result.name).toBe("string")
			expect(typeof result.handle).toBe("string")
			expect(typeof result.product_count).toBe("number")
			expect(typeof result.created_at).toBe("number")

			// Verify optional fields
			if (result.detailed_description !== undefined) {
				expect(typeof result.detailed_description).toBe("string")
			}
			if (result.brand_logo !== undefined) {
				expect(Array.isArray(result.brand_logo)).toBe(true)
				result.brand_logo.forEach((logo) => {
					expect(typeof logo).toBe("string")
				})
			}
			if (result.meta_keywords !== undefined) {
				expect(Array.isArray(result.meta_keywords)).toBe(true)
				result.meta_keywords.forEach((keyword) => {
					expect(typeof keyword).toBe("string")
				})
			}
		})

		it("should handle edge case with zero product count", () => {
			// Arrange
			const productCount = 0

			// Act
			const result = toBrandDocument(mockBrand, null, productCount)

			// Assert
			expect(result.product_count).toBe(0)
			expect(typeof result.product_count).toBe("number")
		})
	})

	describe("when handling different date formats", () => {
		it("should correctly convert ISO 8601 date to timestamp", () => {
			// Arrange
			const brandWithSpecificDate: SyncBrandsStepBrand = {
				...mockBrand,
				created_at: "2024-06-15T14:30:45.123Z",
			}
			const expectedTimestamp = new Date("2024-06-15T14:30:45.123Z").getTime()

			// Act
			const result = toBrandDocument(brandWithSpecificDate, null, 0)

			// Assert
			expect(result.created_at).toBe(expectedTimestamp)
		})

		it("should handle date at epoch start", () => {
			// Arrange
			const brandWithEpochDate: SyncBrandsStepBrand = {
				...mockBrand,
				created_at: "1970-01-01T00:00:00.000Z",
			}
			const expectedTimestamp = 0

			// Act
			const result = toBrandDocument(brandWithEpochDate, null, 0)

			// Assert
			expect(result.created_at).toBe(expectedTimestamp)
		})
	})

	describe("when handling special brand names and handles", () => {
		it("should preserve special characters in name", () => {
			// Arrange
			const brandWithSpecialChars: SyncBrandsStepBrand = {
				...mockBrand,
				name: "Bärlin & Co. (Premium)",
			}

			// Act
			const result = toBrandDocument(brandWithSpecialChars, null, 0)

			// Assert
			expect(result.name).toBe("Bärlin & Co. (Premium)")
		})

		it("should preserve hyphens and underscores in handle", () => {
			// Arrange
			const brandWithComplexHandle: SyncBrandsStepBrand = {
				...mockBrand,
				handle: "my-brand_name-123",
			}

			// Act
			const result = toBrandDocument(brandWithComplexHandle, null, 0)

			// Assert
			expect(result.handle).toBe("my-brand_name-123")
		})
	})
})
