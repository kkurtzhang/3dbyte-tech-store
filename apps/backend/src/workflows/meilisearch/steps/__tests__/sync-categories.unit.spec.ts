import {
	transformCategoriesToDocuments,
	type SyncCategoriesStepInput,
} from "../sync-categories"
import { toCategoryDocument } from "../../../../modules/meilisearch/utils"

/**
 * Unit tests for sync-categories workflow step
 *
 * Tests the transformation of Medusa categories into Meilisearch documents
 * with the new structure using breadcrumb and category_ids instead of path.
 */

describe("sync-categories step", () => {
	describe("transformCategoriesToDocuments", () => {
		it("should transform a single root category to Meilisearch document", () => {
			// Arrange
			const categories: SyncCategoriesStepInput["categories"] = [
				{
					id: "pcat_1",
					name: "Electronics",
					handle: "electronics",
					description: "All electronic products",
					parent_category_id: null,
					parent_category: null,
					rank: 0,
					product_count: 15,
					breadcrumb: [],
					category_ids: ["pcat_1"],
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				id: "pcat_1",
				name: "Electronics",
				handle: "electronics",
				description: "All electronic products",
				parent_category_id: undefined,
				display_path: undefined,
				rank: 0,
				product_count: 15,
				breadcrumb: [],
				category_ids: ["pcat_1"],
			})
			expect(result[0].created_at).toBe(1704067200000) // UNIX timestamp
		})

		it("should transform a single child category with breadcrumb", () => {
			// Arrange
			const categories: SyncCategoriesStepInput["categories"] = [
				{
					id: "pcat_2",
					name: "Laptops",
					handle: "laptops",
					description: "Laptop computers",
					parent_category_id: "pcat_1",
					parent_category: {
						id: "pcat_1",
						name: "Electronics",
						handle: "electronics",
						description: null,
						parent_category_id: null,
						parent_category: null,
						rank: 0,
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-01T00:00:00.000Z",
					},
					rank: 0,
					product_count: 8,
					breadcrumb: [
						{
							id: "pcat_1",
							name: "Electronics",
							handle: "electronics",
						},
					],
					category_ids: ["pcat_1", "pcat_2"],
					created_at: "2024-01-02T00:00:00.000Z",
					updated_at: "2024-01-02T00:00:00.000Z",
				},
			]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				id: "pcat_2",
				name: "Laptops",
				handle: "laptops",
				parent_category_id: "pcat_1",
				display_path: "Electronics",
				product_count: 8,
				breadcrumb: [
					{
						id: "pcat_1",
						name: "Electronics",
						handle: "electronics",
					},
				],
				category_ids: ["pcat_1", "pcat_2"],
			})
		})

		it("should transform a deeply nested category with full breadcrumb", () => {
			// Arrange
			const categories: SyncCategoriesStepInput["categories"] = [
				{
					id: "pcat_4",
					name: "Gaming Laptops",
					handle: "gaming-laptops",
					description: "High-performance gaming laptops",
					parent_category_id: "pcat_3",
					parent_category: {
						id: "pcat_3",
						name: "Laptops",
						handle: "laptops",
						description: null,
						parent_category_id: "pcat_2",
						parent_category: {
							id: "pcat_2",
							name: "Computers",
							handle: "computers",
							description: null,
							parent_category_id: "pcat_1",
							parent_category: {
								id: "pcat_1",
								name: "Electronics",
								handle: "electronics",
								description: null,
								parent_category_id: null,
								parent_category: null,
								rank: 0,
								created_at: "2024-01-01T00:00:00.000Z",
								updated_at: "2024-01-01T00:00:00.000Z",
							},
							rank: 1,
							created_at: "2024-01-02T00:00:00.000Z",
							updated_at: "2024-01-02T00:00:00.000Z",
						},
						rank: 0,
						created_at: "2024-01-03T00:00:00.000Z",
						updated_at: "2024-01-03T00:00:00.000Z",
					},
					rank: 0,
					product_count: 5,
					breadcrumb: [
						{
							id: "pcat_1",
							name: "Electronics",
							handle: "electronics",
						},
						{
							id: "pcat_2",
							name: "Computers",
							handle: "computers",
						},
						{
							id: "pcat_3",
							name: "Laptops",
							handle: "laptops",
						},
					],
					category_ids: ["pcat_1", "pcat_2", "pcat_3", "pcat_4"],
					created_at: "2024-01-04T00:00:00.000Z",
					updated_at: "2024-01-04T00:00:00.000Z",
				},
			]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				id: "pcat_4",
				name: "Gaming Laptops",
				handle: "gaming-laptops",
				display_path: "Electronics > Computers > Laptops",
				product_count: 5,
				breadcrumb: [
					{
						id: "pcat_1",
						name: "Electronics",
						handle: "electronics",
					},
					{
						id: "pcat_2",
						name: "Computers",
						handle: "computers",
					},
					{
						id: "pcat_3",
						name: "Laptops",
						handle: "laptops",
					},
				],
				category_ids: ["pcat_1", "pcat_2", "pcat_3", "pcat_4"],
			})
		})

		it("should transform multiple categories with different hierarchies", () => {
			// Arrange
			const categories: SyncCategoriesStepInput["categories"] = [
				{
					id: "pcat_1",
					name: "Electronics",
					handle: "electronics",
					description: null,
					parent_category_id: null,
					parent_category: null,
					rank: 0,
					product_count: 25,
					breadcrumb: [],
					category_ids: ["pcat_1"],
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "pcat_2",
					name: "Laptops",
					handle: "laptops",
					description: null,
					parent_category_id: "pcat_1",
					parent_category: {
						id: "pcat_1",
						name: "Electronics",
						handle: "electronics",
						description: null,
						parent_category_id: null,
						parent_category: null,
						rank: 0,
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-01T00:00:00.000Z",
					},
					rank: 0,
					product_count: 10,
					breadcrumb: [
						{
							id: "pcat_1",
							name: "Electronics",
							handle: "electronics",
						},
					],
					category_ids: ["pcat_1", "pcat_2"],
					created_at: "2024-01-02T00:00:00.000Z",
					updated_at: "2024-01-02T00:00:00.000Z",
				},
				{
					id: "pcat_3",
					name: "Clothing",
					handle: "clothing",
					description: null,
					parent_category_id: null,
					parent_category: null,
					rank: 1,
					product_count: 30,
					breadcrumb: [],
					category_ids: ["pcat_3"],
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result).toHaveLength(3)

			// First category: root level
			expect(result[0]).toMatchObject({
				id: "pcat_1",
				name: "Electronics",
				breadcrumb: [],
				category_ids: ["pcat_1"],
			})

			// Second category: child of Electronics
			expect(result[1]).toMatchObject({
				id: "pcat_2",
				name: "Laptops",
				display_path: "Electronics",
				breadcrumb: [
					{
						id: "pcat_1",
						name: "Electronics",
						handle: "electronics",
					},
				],
				category_ids: ["pcat_1", "pcat_2"],
			})

			// Third category: root level
			expect(result[2]).toMatchObject({
				id: "pcat_3",
				name: "Clothing",
				breadcrumb: [],
				category_ids: ["pcat_3"],
			})
		})

		it("should handle categories with parent_category_id but no parent_category object", () => {
			// Arrange
			const categories: SyncCategoriesStepInput["categories"] = [
				{
					id: "pcat_2",
					name: "Laptops",
					handle: "laptops",
					description: null,
					parent_category_id: "pcat_1",
					parent_category: null,
					rank: 0,
					product_count: 8,
					breadcrumb: [],
					category_ids: ["pcat_2"],
					created_at: "2024-01-02T00:00:00.000Z",
					updated_at: "2024-01-02T00:00:00.000Z",
				},
			]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				id: "pcat_2",
				name: "Laptops",
				handle: "laptops",
				parent_category_id: "pcat_1",
				display_path: undefined,
				breadcrumb: [],
				category_ids: ["pcat_2"],
			})
		})

		it("should handle empty array", () => {
			// Arrange
			const categories: SyncCategoriesStepInput["categories"] = []

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result).toEqual([])
		})

		it("should handle undefined", () => {
			// Arrange
			const categories = undefined as unknown as SyncCategoriesStepInput["categories"]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result).toEqual([])
		})

		it("should convert Date objects to UNIX timestamps", () => {
			// Arrange
			const testDate = new Date("2024-06-15T10:30:00.000Z")
			const categories: SyncCategoriesStepInput["categories"] = [
				{
					id: "pcat_1",
					name: "Test",
					handle: "test",
					description: null,
					parent_category_id: null,
					parent_category: null,
					rank: 0,
					product_count: 0,
					breadcrumb: [],
					category_ids: ["pcat_1"],
					created_at: testDate,
					updated_at: testDate,
				},
			]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			const expectedTimestamp = testDate.getTime()
			expect(result[0].created_at).toBe(expectedTimestamp)
		})

		it("should handle missing optional description", () => {
			// Arrange
			const categories: SyncCategoriesStepInput["categories"] = [
				{
					id: "pcat_1",
					name: "Test",
					handle: "test",
					description: undefined,
					parent_category_id: null,
					parent_category: null,
					rank: 0,
					product_count: 0,
					breadcrumb: [],
					category_ids: ["pcat_1"],
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result[0].description).toBeUndefined()
		})

		it("should handle zero product count", () => {
			// Arrange
			const categories: SyncCategoriesStepInput["categories"] = [
				{
					id: "pcat_1",
					name: "Empty Category",
					handle: "empty-category",
					description: "No products yet",
					parent_category_id: null,
					parent_category: null,
					rank: 0,
					product_count: 0,
					breadcrumb: [],
					category_ids: ["pcat_1"],
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result[0].product_count).toBe(0)
		})

		it("should handle categories with large hierarchies (5 levels)", () => {
			// Arrange
			const categories: SyncCategoriesStepInput["categories"] = [
				{
					id: "pcat_6",
					name: "Ultra Gaming Laptops",
					handle: "ultra-gaming-laptops",
					description: null,
					parent_category_id: "pcat_5",
					parent_category: {
						id: "pcat_5",
						name: "High-End Gaming",
						handle: "high-end-gaming",
						description: null,
						parent_category_id: "pcat_4",
						parent_category: {
							id: "pcat_4",
							name: "Gaming Laptops",
							handle: "gaming-laptops",
							description: null,
							parent_category_id: "pcat_3",
							parent_category: {
								id: "pcat_3",
								name: "Laptops",
								handle: "laptops",
								description: null,
								parent_category_id: "pcat_2",
								parent_category: {
									id: "pcat_2",
									name: "Computers",
									handle: "computers",
									description: null,
									parent_category_id: "pcat_1",
									parent_category: {
										id: "pcat_1",
										name: "Electronics",
										handle: "electronics",
										description: null,
										parent_category_id: null,
										parent_category: null,
										rank: 0,
										created_at: "2024-01-01T00:00:00.000Z",
										updated_at: "2024-01-01T00:00:00.000Z",
									},
									rank: 1,
									created_at: "2024-01-02T00:00:00.000Z",
									updated_at: "2024-01-02T00:00:00.000Z",
								},
								rank: 0,
								created_at: "2024-01-03T00:00:00.000Z",
								updated_at: "2024-01-03T00:00:00.000Z",
							},
							rank: 0,
							created_at: "2024-01-04T00:00:00.000Z",
							updated_at: "2024-01-04T00:00:00.000Z",
						},
						rank: 0,
						created_at: "2024-01-05T00:00:00.000Z",
						updated_at: "2024-01-05T00:00:00.000Z",
					},
					rank: 0,
					product_count: 3,
					breadcrumb: [
						{
							id: "pcat_1",
							name: "Electronics",
							handle: "electronics",
						},
						{
							id: "pcat_2",
							name: "Computers",
							handle: "computers",
						},
						{
							id: "pcat_3",
							name: "Laptops",
							handle: "laptops",
						},
						{
							id: "pcat_4",
							name: "Gaming Laptops",
							handle: "gaming-laptops",
						},
						{
							id: "pcat_5",
							name: "High-End Gaming",
							handle: "high-end-gaming",
						},
					],
					category_ids: ["pcat_1", "pcat_2", "pcat_3", "pcat_4", "pcat_5", "pcat_6"],
					created_at: "2024-01-06T00:00:00.000Z",
					updated_at: "2024-01-06T00:00:00.000Z",
				},
			]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0].breadcrumb).toHaveLength(5)
			expect(result[0].category_ids).toHaveLength(6)
			expect(result[0].category_ids).toEqual([
				"pcat_1",
				"pcat_2",
				"pcat_3",
				"pcat_4",
				"pcat_5",
				"pcat_6",
			])
			expect(result[0].breadcrumb[0]).toMatchObject({
				id: "pcat_1",
				name: "Electronics",
				handle: "electronics",
			})
			expect(result[0].breadcrumb[4]).toMatchObject({
				id: "pcat_5",
				name: "High-End Gaming",
				handle: "high-end-gaming",
			})
		})

		it("should handle categories with special characters in names", () => {
			// Arrange
			const categories: SyncCategoriesStepInput["categories"] = [
				{
					id: "pcat_1",
					name: "Men's & Women's Clothing",
					handle: "mens-womens-clothing",
					description: "Clothing for everyone",
					parent_category_id: null,
					parent_category: null,
					rank: 0,
					product_count: 100,
					breadcrumb: [],
					category_ids: ["pcat_1"],
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result[0].name).toBe("Men's & Women's Clothing")
			expect(result[0].handle).toBe("mens-womens-clothing")
			expect(result[0].description).toBe("Clothing for everyone")
		})

		it("should handle categories with numeric rank values", () => {
			// Arrange
			const categories: SyncCategoriesStepInput["categories"] = [
				{
					id: "pcat_1",
					name: "Featured",
					handle: "featured",
					description: null,
					parent_category_id: null,
					parent_category: null,
					rank: 999,
					product_count: 50,
					breadcrumb: [],
					category_ids: ["pcat_1"],
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]

			// Act
			const result = transformCategoriesToDocuments(categories)

			// Assert
			expect(result[0].rank).toBe(999)
		})
	})

	describe("toCategoryDocument helper", () => {
		it("should generate correct breadcrumb for root category", () => {
			// Arrange
			const category = {
				id: "pcat_1",
				name: "Electronics",
				handle: "electronics",
				description: null,
				parent_category_id: null,
				parent_category: null,
				rank: 0,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			}

			// Act
			const result = toCategoryDocument(category, 10, [], ["pcat_1"])

			// Assert
			expect(result.breadcrumb).toEqual([])
			expect(result.category_ids).toEqual(["pcat_1"])
		})

		it("should generate correct breadcrumb for child category", () => {
			// Arrange
			const category = {
				id: "pcat_2",
				name: "Laptops",
				handle: "laptops",
				description: null,
				parent_category_id: "pcat_1",
				parent_category: {
					id: "pcat_1",
					name: "Electronics",
					handle: "electronics",
					description: null,
					parent_category_id: null,
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				rank: 0,
				created_at: "2024-01-02T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
			}

			// Act
			const result = toCategoryDocument(
				category,
				8,
				[{ id: "pcat_1", name: "Electronics", handle: "electronics" }],
				["pcat_1", "pcat_2"]
			)

			// Assert
			expect(result.breadcrumb).toEqual([
				{ id: "pcat_1", name: "Electronics", handle: "electronics" },
			])
			expect(result.category_ids).toEqual(["pcat_1", "pcat_2"])
		})

		it("should generate correct display_path for child category", () => {
			// Arrange
			const category = {
				id: "pcat_2",
				name: "Laptops",
				handle: "laptops",
				description: null,
				parent_category_id: "pcat_1",
				parent_category: {
					id: "pcat_1",
					name: "Electronics",
					handle: "electronics",
					description: null,
					parent_category_id: null,
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				rank: 0,
				created_at: "2024-01-02T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
			}

			// Act
			const result = toCategoryDocument(
				category,
				8,
				[{ id: "pcat_1", name: "Electronics", handle: "electronics" }],
				["pcat_1", "pcat_2"]
			)

			// Assert
			expect(result.display_path).toBe("Electronics")
		})

		it("should have undefined display_path for root category", () => {
			// Arrange
			const category = {
				id: "pcat_1",
				name: "Electronics",
				handle: "electronics",
				description: null,
				parent_category_id: null,
				parent_category: null,
				rank: 0,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			}

			// Act
			const result = toCategoryDocument(category, 10, [], ["pcat_1"])

			// Assert
			expect(result.display_path).toBeUndefined()
		})
	})
})
