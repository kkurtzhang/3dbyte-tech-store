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

// Use require for dynamic imports to avoid ESM extension issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const brandCreated = require("../brand-created")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const brandUpdated = require("../brand-updated")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const brandDeleted = require("../brand-deleted")

describe("brand-sync subscribers", () => {
	describe("brand-created subscriber", () => {
		it("should export a handler function and config", () => {
			const handler = brandCreated.default
			const config = brandCreated.config

			expect(handler).toBeDefined()
			expect(typeof handler).toBe("function")
			expect(config).toBeDefined()
			expect(config.event).toBe("brand.created")
		})
	})

	describe("brand-updated subscriber", () => {
		it("should export a handler function and config", () => {
			const handler = brandUpdated.default
			const config = brandUpdated.config

			expect(handler).toBeDefined()
			expect(typeof handler).toBe("function")
			expect(config).toBeDefined()
			expect(config.event).toBe("brand.updated")
		})
	})

	describe("brand-deleted subscriber", () => {
		it("should export a handler function and config", () => {
			const handler = brandDeleted.default
			const config = brandDeleted.config

			expect(handler).toBeDefined()
			expect(typeof handler).toBe("function")
			expect(config).toBeDefined()
			expect(config.event).toBe("brand.deleted")
		})
	})
})
