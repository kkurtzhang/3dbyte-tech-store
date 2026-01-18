import { describe, it, expect } from "@jest/globals"
import {
	computeProductCountsForCategories,
	aggregateChildCategoryCounts,
} from "../compute-product-counts"
import type { ProductFromQuery } from "../compute-product-counts"
import type { SyncCategoriesStepCategory } from "../../../../modules/meilisearch/utils"

describe("computeProductCountsForCategories", () => {
	describe("when categories have no products", () => {
		it("should return zero counts for all categories", () => {
			// Arrange
			const products: ProductFromQuery[] = []
			const categoryIds = ["cat_1", "cat_2", "cat_3"]

			// Act
			const result = computeProductCountsForCategories(products, categoryIds)

			// Assert
			expect(result).toEqual({
				cat_1: 0,
				cat_2: 0,
				cat_3: 0,
			})
		})
	})

	describe("when products are assigned to single categories", () => {
		it("should count products correctly", () => {
			// Arrange
			const products: ProductFromQuery[] = [
				{
					id: "prod_1",
					status: "published",
					categories: [{ id: "cat_1", name: "Electronics", handle: "electronics" }],
				},
				{
					id: "prod_2",
					status: "published",
					categories: [{ id: "cat_2", name: "Clothing", handle: "clothing" }],
				},
				{
					id: "prod_3",
					status: "published",
					categories: [{ id: "cat_1", name: "Electronics", handle: "electronics" }],
				},
			]
			const categoryIds = ["cat_1", "cat_2"]

			// Act
			const result = computeProductCountsForCategories(products, categoryIds)

			// Assert
			expect(result).toEqual({
				cat_1: 2,
				cat_2: 1,
			})
		})
	})

	describe("when products belong to multiple categories", () => {
		it("should count product in each category it belongs to", () => {
			// Arrange
			const products: ProductFromQuery[] = [
				{
					id: "prod_1",
					status: "published",
					categories: [
						{ id: "cat_1", name: "Electronics", handle: "electronics" },
						{ id: "cat_2", name: "Sale", handle: "sale" },
					],
				},
				{
					id: "prod_2",
					status: "published",
					categories: [
						{ id: "cat_1", name: "Electronics", handle: "electronics" },
					],
				},
			]
			const categoryIds = ["cat_1", "cat_2"]

			// Act
			const result = computeProductCountsForCategories(products, categoryIds)

			// Assert
			expect(result).toEqual({
				cat_1: 2,
				cat_2: 1,
			})
		})
	})

	describe("when products have draft status", () => {
		it("should not count draft products", () => {
			// Arrange
			const products: ProductFromQuery[] = [
				{
					id: "prod_1",
					status: "published",
					categories: [{ id: "cat_1", name: "Electronics", handle: "electronics" }],
				},
				{
					id: "prod_2",
					status: "draft",
					categories: [{ id: "cat_1", name: "Electronics", handle: "electronics" }],
				},
				{
					id: "prod_3",
					status: "proposed",
					categories: [{ id: "cat_1", name: "Electronics", handle: "electronics" }],
				},
			]
			const categoryIds = ["cat_1"]

			// Act
			const result = computeProductCountsForCategories(products, categoryIds)

			// Assert
			expect(result).toEqual({
				cat_1: 1,
			})
		})
	})

	describe("when products have no categories", () => {
		it("should not count uncategorized products", () => {
			// Arrange
			const products: ProductFromQuery[] = [
				{
					id: "prod_1",
					status: "published",
					categories: [{ id: "cat_1", name: "Electronics", handle: "electronics" }],
				},
				{
					id: "prod_2",
					status: "published",
					categories: null,
				},
				{
					id: "prod_3",
					status: "published",
					categories: [],
				},
			]
			const categoryIds = ["cat_1"]

			// Act
			const result = computeProductCountsForCategories(products, categoryIds)

			// Assert
			expect(result).toEqual({
				cat_1: 1,
			})
		})
	})

	describe("when products belong to categories not in the list", () => {
		it("should only count for specified categories", () => {
			// Arrange
			const products: ProductFromQuery[] = [
				{
					id: "prod_1",
					status: "published",
					categories: [
						{ id: "cat_1", name: "Electronics", handle: "electronics" },
						{ id: "cat_99", name: "Other", handle: "other" },
					],
				},
			]
			const categoryIds = ["cat_1"]

			// Act
			const result = computeProductCountsForCategories(products, categoryIds)

			// Assert
			expect(result).toEqual({
				cat_1: 1,
			})
		})
	})

	describe("when category list is empty", () => {
		it("should return empty object", () => {
			// Arrange
			const products: ProductFromQuery[] = [
				{
					id: "prod_1",
					status: "published",
					categories: [{ id: "cat_1", name: "Electronics", handle: "electronics" }],
				},
			]
			const categoryIds: string[] = []

			// Act
			const result = computeProductCountsForCategories(products, categoryIds)

			// Assert
			expect(result).toEqual({})
		})
	})

	describe("when mixing published and unpublished products", () => {
		it("should count only published products across all categories", () => {
			// Arrange
			const products: ProductFromQuery[] = [
				{
					id: "prod_1",
					status: "published",
					categories: [{ id: "cat_1", name: "Electronics", handle: "electronics" }],
				},
				{
					id: "prod_2",
					status: "draft",
					categories: [{ id: "cat_1", name: "Electronics", handle: "electronics" }],
				},
				{
					id: "prod_3",
					status: "published",
					categories: [{ id: "cat_2", name: "Clothing", handle: "clothing" }],
				},
				{
					id: "prod_4",
					status: "rejected",
					categories: [{ id: "cat_2", name: "Clothing", handle: "clothing" }],
				},
				{
					id: "prod_5",
					status: "published",
					categories: [
						{ id: "cat_1", name: "Electronics", handle: "electronics" },
						{ id: "cat_2", name: "Clothing", handle: "clothing" },
					],
				},
			]
			const categoryIds = ["cat_1", "cat_2"]

			// Act
			const result = computeProductCountsForCategories(products, categoryIds)

			// Assert
			expect(result).toEqual({
				cat_1: 2, // prod_1 and prod_5
				cat_2: 2, // prod_3 and prod_5
			})
		})
	})
})

describe("aggregateChildCategoryCounts", () => {
	describe("when parent category has child products", () => {
		it("should aggregate child counts to parent", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = [
				{
					id: "cat_1",
					name: "Electronics",
					handle: "electronics",
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "cat_2",
					name: "Laptops",
					handle: "laptops",
					parent_category: {
						id: "cat_1",
						name: "Electronics",
						handle: "electronics",
						parent_category: null,
						rank: 0,
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-01T00:00:00.000Z",
					},
					rank: 1,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]
			const directCounts = { cat_1: 0, cat_2: 5 }

			// Act
			const result = aggregateChildCategoryCounts(categories, directCounts)

			// Assert
			expect(result).toEqual({
				cat_1: 5, // Parent now shows child products
				cat_2: 5,
			})
		})
	})

	describe("when parent category has direct and child products", () => {
		it("should sum direct and inherited products", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = [
				{
					id: "cat_1",
					name: "Electronics",
					handle: "electronics",
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "cat_2",
					name: "Laptops",
					handle: "laptops",
					parent_category: {
						id: "cat_1",
						name: "Electronics",
						handle: "electronics",
						parent_category: null,
						rank: 0,
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-01T00:00:00.000Z",
					},
					rank: 1,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]
			const directCounts = { cat_1: 3, cat_2: 5 }

			// Act
			const result = aggregateChildCategoryCounts(categories, directCounts)

			// Assert
			expect(result).toEqual({
				cat_1: 8, // 3 direct + 5 from child
				cat_2: 5,
			})
		})
	})

	describe("when category has multiple children", () => {
		it("should aggregate all child counts", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = [
				{
					id: "cat_1",
					name: "Electronics",
					handle: "electronics",
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "cat_2",
					name: "Laptops",
					handle: "laptops",
					parent_category: {
						id: "cat_1",
						name: "Electronics",
						handle: "electronics",
						parent_category: null,
						rank: 0,
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-01T00:00:00.000Z",
					},
					rank: 1,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "cat_3",
					name: "Phones",
					handle: "phones",
					parent_category: {
						id: "cat_1",
						name: "Electronics",
						handle: "electronics",
						parent_category: null,
						rank: 0,
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-01T00:00:00.000Z",
					},
					rank: 2,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]
			const directCounts = { cat_1: 0, cat_2: 5, cat_3: 3 }

			// Act
			const result = aggregateChildCategoryCounts(categories, directCounts)

			// Assert
			expect(result).toEqual({
				cat_1: 8, // 5 + 3 from children
				cat_2: 5,
				cat_3: 3,
			})
		})
	})

	describe("when category has multi-level hierarchy", () => {
		it("should aggregate through all levels", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = [
				{
					id: "cat_1",
					name: "Electronics",
					handle: "electronics",
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "cat_2",
					name: "Computers",
					handle: "computers",
					parent_category: {
						id: "cat_1",
						name: "Electronics",
						handle: "electronics",
						parent_category: null,
						rank: 0,
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-01T00:00:00.000Z",
					},
					rank: 1,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "cat_3",
					name: "Laptops",
					handle: "laptops",
					parent_category: {
						id: "cat_2",
						name: "Computers",
						handle: "computers",
						parent_category: null,
						rank: 1,
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-01T00:00:00.000Z",
					},
					rank: 2,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]
			const directCounts = { cat_1: 0, cat_2: 0, cat_3: 7 }

			// Act
			const result = aggregateChildCategoryCounts(categories, directCounts)

			// Assert
			expect(result).toEqual({
				cat_1: 7, // Grandchild counts aggregated upward
				cat_2: 7, // Includes grandchild
				cat_3: 7,
			})
		})
	})

	describe("when categories have no hierarchy", () => {
		it("should return original counts", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = [
				{
					id: "cat_1",
					name: "Electronics",
					handle: "electronics",
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "cat_2",
					name: "Clothing",
					handle: "clothing",
					parent_category: null,
					rank: 1,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]
			const directCounts = { cat_1: 5, cat_2: 8 }

			// Act
			const result = aggregateChildCategoryCounts(categories, directCounts)

			// Assert
			expect(result).toEqual({
				cat_1: 5,
				cat_2: 8,
			})
		})
	})

	describe("when category list is empty", () => {
		it("should return empty object", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = []
			const directCounts: Record<string, number> = {}

			// Act
			const result = aggregateChildCategoryCounts(categories, directCounts)

			// Assert
			expect(result).toEqual({})
		})
	})
})
