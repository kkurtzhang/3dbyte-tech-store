import { describe, it, expect } from "@jest/globals"
import { computeCategoryPathsForCategories } from "../compute-category-path"
import type { SyncCategoriesStepCategory } from "../../../../modules/meilisearch/utils"

describe("computeCategoryPathsForCategories", () => {
	describe("when categories have no parent", () => {
		it("should compute path as single-element array", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = [
				{
					id: "cat_1",
					name: "Men",
					handle: "men",
					description: "Men's category",
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]

			// Act
			const result = computeCategoryPathsForCategories(categories)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				id: "cat_1",
				name: "Men",
				path: ["Men"],
				parent_name: undefined,
			})
		})
	})

	describe("when categories have single-level parent", () => {
		it("should compute path and parent breadcrumb correctly", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = [
				{
					id: "cat_2",
					name: "Clothing",
					handle: "clothing",
					description: "Clothing category",
					parent_category: {
						id: "cat_1",
						name: "Men",
						handle: "men",
						description: "Men's category",
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

			// Act
			const result = computeCategoryPathsForCategories(categories)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				id: "cat_2",
				name: "Clothing",
				path: ["Men", "Clothing"],
				parent_name: "Men",
			})
		})
	})

	describe("when categories have multi-level parent hierarchy", () => {
		it("should compute full path and parent breadcrumb", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = [
				{
					id: "cat_3",
					name: "Shoes",
					handle: "shoes",
					description: "Shoes category",
					parent_category: {
						id: "cat_2",
						name: "Clothing",
						handle: "clothing",
						description: "Clothing category",
						parent_category: {
							id: "cat_1",
							name: "Men",
							handle: "men",
							description: "Men's category",
							parent_category: null,
							rank: 0,
							created_at: "2024-01-01T00:00:00.000Z",
							updated_at: "2024-01-01T00:00:00.000Z",
						},
						rank: 1,
						created_at: "2024-01-01T00:00:00.000Z",
						updated_at: "2024-01-01T00:00:00.000Z",
					},
					rank: 2,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]

			// Act
			const result = computeCategoryPathsForCategories(categories)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				id: "cat_3",
				name: "Shoes",
				path: ["Men", "Clothing", "Shoes"],
				parent_name: "Men > Clothing",
			})
		})
	})

	describe("when processing multiple categories", () => {
		it("should compute paths for all categories independently", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = [
				{
					id: "cat_1",
					name: "Men",
					handle: "men",
					description: "Men's category",
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "cat_2",
					name: "Women",
					handle: "women",
					description: "Women's category",
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "cat_3",
					name: "Shoes",
					handle: "shoes",
					description: "Shoes category",
					parent_category: {
						id: "cat_1",
						name: "Men",
						handle: "men",
						description: "Men's category",
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

			// Act
			const result = computeCategoryPathsForCategories(categories)

			// Assert
			expect(result).toHaveLength(3)

			// First category - root level
			expect(result[0]).toMatchObject({
				id: "cat_1",
				name: "Men",
				path: ["Men"],
				parent_name: undefined,
			})

			// Second category - root level
			expect(result[1]).toMatchObject({
				id: "cat_2",
				name: "Women",
				path: ["Women"],
				parent_name: undefined,
			})

			// Third category - has parent
			expect(result[2]).toMatchObject({
				id: "cat_3",
				name: "Shoes",
				path: ["Men", "Shoes"],
				parent_name: "Men",
			})
		})
	})

	describe("when categories array is empty", () => {
		it("should return empty array", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = []

			// Act
			const result = computeCategoryPathsForCategories(categories)

			// Assert
			expect(result).toHaveLength(0)
		})
	})

	describe("when categories have optional description", () => {
		it("should preserve description field", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = [
				{
					id: "cat_1",
					name: "Men",
					handle: "men",
					description: "Men's clothing and accessories",
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]

			// Act
			const result = computeCategoryPathsForCategories(categories)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				id: "cat_1",
				name: "Men",
				description: "Men's clothing and accessories",
				path: ["Men"],
			})
		})
	})

	describe("when categories have null description", () => {
		it("should handle null description gracefully", () => {
			// Arrange
			const categories: SyncCategoriesStepCategory[] = [
				{
					id: "cat_1",
					name: "Men",
					handle: "men",
					description: null,
					parent_category: null,
					rank: 0,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			]

			// Act
			const result = computeCategoryPathsForCategories(categories)

			// Assert
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({
				id: "cat_1",
				name: "Men",
				description: null,
				path: ["Men"],
			})
		})
	})

	describe("when categories array is null or undefined", () => {
		it("should handle null input", () => {
			// Act
			const result = computeCategoryPathsForCategories(null as unknown as SyncCategoriesStepCategory[])

			// Assert
			expect(result).toHaveLength(0)
		})

		it("should handle undefined input", () => {
			// Act
			const result = computeCategoryPathsForCategories(undefined as unknown as SyncCategoriesStepCategory[])

			// Assert
			expect(result).toHaveLength(0)
		})
	})
})
