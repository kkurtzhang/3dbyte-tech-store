/**
 * Unit tests for brand-sync subscriber
 *
 * Tests that brand events trigger the correct workflows:
 * - brand.created: Workflow A (basic index) + Workflow B (sync to Strapi)
 * - brand.updated: Workflow A (basic index) + Workflow B (sync to Strapi)
 * - brand.deleted: Workflow D (delete from Meilisearch and Strapi)
 */

// Note: These are structural tests verifying the subscriber exports correctly.
// Full integration testing requires a running Medusa instance.

describe("brand-sync subscribers", () => {
	describe("brand-created subscriber", () => {
		it("should export a handler function and config", async () => {
			const { default: handler, config } = await import("../brand-created")

			expect(handler).toBeDefined()
			expect(typeof handler).toBe("function")
			expect(config).toBeDefined()
			expect(config.event).toBe("brand.created")
		})
	})

	describe("brand-updated subscriber", () => {
		it("should export a handler function and config", async () => {
			const { default: handler, config } = await import("../brand-updated")

			expect(handler).toBeDefined()
			expect(typeof handler).toBe("function")
			expect(config).toBeDefined()
			expect(config.event).toBe("brand.updated")
		})
	})

	describe("brand-deleted subscriber", () => {
		it("should export a handler function and config", async () => {
			const { default: handler, config } = await import("../brand-deleted")

			expect(handler).toBeDefined()
			expect(typeof handler).toBe("function")
			expect(config).toBeDefined()
			expect(config.event).toBe("brand.deleted")
		})
	})
})
