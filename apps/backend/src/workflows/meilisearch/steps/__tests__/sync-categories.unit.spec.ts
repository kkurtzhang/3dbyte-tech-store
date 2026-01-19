import { transformCategoriesToDocuments } from "../sync-categories"

describe("sync-categories step", () => {
	describe("transformCategoriesToDocuments", () => {
		it("should transform empty array", () => {
			const result = transformCategoriesToDocuments([])
			expect(result).toEqual([])
		})

		it("should transform single category without parent", () => {
			const categories = [
				{
					id: "cat_1",
					name: "Electronics",
					handle: "electronics",
					description: "Electronic devices",
					parent_category: null,
					rank: 0,
					path: ["Electronics"],
					parent_name: undefined,
					product_count: 15,
					created_at: "2024-01-01T00:00:00.000Z",
				},
			]

			const result = transformCategoriesToDocuments(categories)

			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				id: "cat_1",
				name: "Electronics",
				handle: "electronics",
				description: "Electronic devices",
				parent_category_id: undefined,
				parent_name: undefined,
				rank: 0,
				path: ["Electronics"],
				product_count: 15,
			})
			expect(result[0].created_at).toBe(1704067200000) // UNIX timestamp
		})

		it("should transform category with parent", () => {
			const categories = [
				{
					id: "cat_2",
					name: "Laptops",
					handle: "laptops",
					description: "Laptop computers",
					parent_category: {
						id: "cat_1",
						name: "Electronics",
					},
					rank: 1,
					path: ["Electronics", "Laptops"],
					parent_name: "Electronics",
					product_count: 8,
					created_at: "2024-01-02T00:00:00.000Z",
				},
			]

			const result = transformCategoriesToDocuments(categories)

			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				id: "cat_2",
				name: "Laptops",
				handle: "laptops",
				description: "Laptop computers",
				parent_category_id: "cat_1",
				parent_name: "Electronics",
				rank: 1,
				path: ["Electronics", "Laptops"],
				product_count: 8,
			})
		})

		it("should transform multiple categories", () => {
			const categories = [
				{
					id: "cat_1",
					name: "Electronics",
					handle: "electronics",
					description: null,
					parent_category: null,
					rank: 0,
					path: ["Electronics"],
					parent_name: undefined,
					product_count: 15,
					created_at: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "cat_2",
					name: "Laptops",
					handle: "laptops",
					description: "Laptop computers",
					parent_category: {
						id: "cat_1",
						name: "Electronics",
					},
					rank: 1,
					path: ["Electronics", "Laptops"],
					parent_name: "Electronics",
					product_count: 8,
					created_at: "2024-01-02T00:00:00.000Z",
				},
			]

			const result = transformCategoriesToDocuments(categories)

			expect(result).toHaveLength(2)
			expect(result[0].name).toBe("Electronics")
			expect(result[1].name).toBe("Laptops")
		})

		it("should handle category with zero product count", () => {
			const categories = [
				{
					id: "cat_1",
					name: "Empty Category",
					handle: "empty-category",
					description: null,
					parent_category: null,
					rank: 0,
					path: ["Empty Category"],
					parent_name: undefined,
					product_count: 0,
					created_at: "2024-01-01T00:00:00.000Z",
				},
			]

			const result = transformCategoriesToDocuments(categories)

			expect(result).toHaveLength(1)
			expect(result[0].product_count).toBe(0)
		})

		it("should convert created_at to UNIX timestamp in milliseconds", () => {
			const categories = [
				{
					id: "cat_1",
					name: "Test Category",
					handle: "test-category",
					description: null,
					parent_category: null,
					rank: 0,
					path: ["Test Category"],
					parent_name: undefined,
					product_count: 5,
					created_at: "2024-01-15T12:30:45.000Z",
				},
			]

			const result = transformCategoriesToDocuments(categories)

			expect(result[0].created_at).toBe(new Date("2024-01-15T12:30:45.000Z").getTime())
		})

		it("should handle undefined description", () => {
			const categories = [
				{
					id: "cat_1",
					name: "Test",
					handle: "test",
					description: undefined,
					parent_category: null,
					rank: 0,
					path: ["Test"],
					parent_name: undefined,
					product_count: 1,
					created_at: "2024-01-01T00:00:00.000Z",
				},
			]

			const result = transformCategoriesToDocuments(categories)

			expect(result[0].description).toBeUndefined()
		})
	})
})
