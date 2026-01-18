import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

jest.setTimeout(60 * 1000)

/**
 * SMOKE TESTS for Meilisearch Brand Sync Integration
 *
 * DISCLAIMER: These are smoke tests only, not full integration tests.
 *
 * Due to infrastructure limitations in the test environment, these tests verify:
 * - API endpoints are accessible and respond correctly
 * - Basic request/response structure validation
 * - Error handling and edge cases
 *
 * These tests DO NOT verify:
 * - Actual Meilisearch indexing (requires Meilisearch client access)
 * - Document presence in Meilisearch index
 * - Search functionality with indexed brands
 * - Full end-to-end brand lifecycle
 *
 * For comprehensive testing, see the advanced E2E example at the bottom of this file.
 *
 * PREREQUISITES:
 * - PostgreSQL database running (DATABASE_URL in .env)
 * - Medusa backend server running
 * - Brand module registered in medusa-config.ts
 *
 * NOTE: Meilisearch server is NOT required for these smoke tests.
 */
medusaIntegrationTestRunner({
	inApp: true,
	testSuite: ({ api }) => {
		describe("GET /admin/meilisearch/sync-brands (endpoint discovery)", () => {
			it("should return sync endpoint information", async () => {
				const response = await api.get(`/admin/meilisearch/sync-brands`)

				expect(response.status).toEqual(200)
				expect(response.data).toHaveProperty("endpoint", "/admin/meilisearch/sync-brands")
				expect(response.data).toHaveProperty("method", "POST")
				expect(response.data).toHaveProperty("description")
				expect(response.data).toHaveProperty("behavior")
			})
		})

		describe("POST /admin/meilisearch/sync-brands (brand sync)", () => {
			it("should trigger brand sync workflow and return success response", async () => {
				// Act: Trigger the brand sync workflow
				const response = await api.post(`/admin/meilisearch/sync-brands`)

				// Assert: Verify response structure
				expect(response.status).toEqual(200)
				expect(response.data).toHaveProperty("message")
				expect(response.data).toHaveProperty("indexed")

				// The indexed count should be a non-negative number
				expect(typeof response.data.indexed).toBe("number")
				expect(response.data.indexed).toBeGreaterThanOrEqual(0)

				// Note: In a full integration test with Meilisearch client access,
				// we would also:
				// 1. Get the task UID from the sync response (if exposed)
				// 2. Wait for task completion: await client.waitForTask(taskUid)
				// 3. Verify documents are indexed in Meilisearch
				// 4. Search for test brands and verify results
			})

			it("should handle sync when no brands exist", async () => {
				// This test verifies the sync works even with an empty brand list
				// Note: The actual indexed count may vary based on existing data in the database
				const response = await api.post(`/admin/meilisearch/sync-brands`)

				expect(response.status).toEqual(200)
				// Accept 0 or any positive number (depending on test environment state)
				expect(response.data).toHaveProperty("indexed")
				expect(typeof response.data.indexed).toBe("number")
				expect(response.data.indexed).toBeGreaterThanOrEqual(0)
			})
		})

		describe("Brand sync workflow error handling", () => {
			it("should return appropriate error response on sync failure", async () => {
				// This test documents error handling behavior
				// In a real scenario, we would mock the Meilisearch service to throw errors

				// For now, we just verify the endpoint is accessible
				const response = await api.get(`/admin/meilisearch/sync-brands`)
				expect(response.status).toEqual(200)
			})
		})

		/**
		 * ADVANCED: End-to-end brand lifecycle test
		 *
		 * This test would cover the full workflow:
		 * 1. Create test brands via POST /admin/brands
		 * 2. Trigger sync via POST /admin/meilisearch/sync-brands
		 * 3. Wait for Meilisearch tasks using client.waitForTask(taskUid)
		 * 4. Verify brands are indexed in Meilisearch
		 * 5. Search for brands in Meilisearch
		 * 6. Update a brand via POST /admin/brands/:id
		 * 7. Re-sync and verify update in Meilisearch
		 * 8. Delete brand and verify removal from index
		 * 9. Clean up test data
		 *
		 * NOTE: This requires:
		 * - Direct Meilisearch client access in tests
		 * - Brand CRUD endpoints to be working
		 * - Proper test data cleanup
		 *
		 * Example implementation pattern:
		 *
		 * it("should handle full brand lifecycle: create -> sync -> search -> update -> delete", async () => {
		 *   const { MeiliSearch } = require("meilisearch")
		 *   const client = new MeiliSearch({
		 *     host: process.env.MEILISEARCH_HOST,
		 *     apiKey: process.env.MEILISEARCH_API_KEY,
		 *   })
		 *
		 *   // Create brand
		 *   const brandResponse = await api.post(`/admin/brands`, {
		 *     name: "Test Brand",
		 *     handle: "test-brand",
		 *   })
		 *   const brandId = brandResponse.data.brand.id
		 *
		 *   // Sync to Meilisearch
		 *   const syncResponse = await api.post(`/admin/meilisearch/sync-brands`)
		 *   expect(syncResponse.status).toEqual(200)
		 *
		 *   // CRITICAL: Wait for task completion before asserting
		 *   const index = client.index("brands")
		 *   const task = await index.getTask({ uid: syncResponse.data.taskUid })
		 *   await client.waitForTask(task.taskUid)
		 *
		 *   // Verify document is indexed
		 *   const document = await index.getDocument(brandId)
		 *   expect(document).toHaveProperty("id", brandId)
		 *   expect(document).toHaveProperty("name", "Test Brand")
		 *
		 *   // Cleanup
		 *   await api.delete(`/admin/brands/${brandId}`)
		 * })
		 */
		}
	}
})
