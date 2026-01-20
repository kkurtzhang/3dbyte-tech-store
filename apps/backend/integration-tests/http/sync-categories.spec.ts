import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

/**
 * Integration tests for category sync API endpoint
 * Tests the POST /admin/meilisearch/sync-categories endpoint
 *
 * This test file contains integration tests for the category sync functionality,
 * ensuring the endpoint correctly syncs categories to Meilisearch.
 */

export default medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("POST /admin/meilisearch/sync-categories", () => {
      describe("successful sync", () => {
        it("syncs categories and returns correct response", async () => {
          const response = await api.post(
            `/admin/meilisearch/sync-categories`,
            {} // No request body needed
          )

          expect(response.status).toEqual(200)
          expect(response.data).toHaveProperty("message")
          expect(response.data.message).toEqual("Categories synced to Meilisearch successfully")
          expect(response.data).toHaveProperty("indexed")
          expect(typeof response.data.indexed).toBe("number")
        })
      })

      describe("handles empty categories", () => {
        it("returns zero indexed when no categories exist", async () => {
          // This test assumes Medusa returns an empty array
          const response = await api.post(
            `/admin/meilisearch/sync-categories`,
            {}
          )

          expect(response.status).toEqual(200)
          expect(response.data).toHaveProperty("indexed")
          expect(response.data.indexed).toBe(0)
          expect(response.data.deleted).toBe(0)
        })
      })
    })
  },
})

jest.setTimeout(60 * 1000)