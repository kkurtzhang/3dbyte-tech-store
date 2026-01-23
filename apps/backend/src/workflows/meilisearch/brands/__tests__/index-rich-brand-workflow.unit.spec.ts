/**
 * Unit tests for index-rich-brand-workflow
 *
 * Tests the workflow that indexes rich brand data to Meilisearch.
 * This workflow is triggered by Strapi webhooks (entry.publish).
 * It includes Strapi enrichment (logo, description) and product count.
 *
 * Retry config: { maxRetries: 5, retryInterval: 2 }
 */
import {
	indexRichBrandWorkflow,
	type IndexRichBrandWorkflowInput,
} from "../index-rich-brand-workflow"
import type {
	SyncBrandsStepBrand,
	StrapiBrandDescription,
} from "@3dbyte-tech-store/shared-types"

describe("indexRichBrandWorkflow", () => {
	describe("module exports", () => {
		it("should export indexRichBrandWorkflow", () => {
			expect(indexRichBrandWorkflow).toBeDefined()
		})

		it("should export IndexRichBrandWorkflowInput type", () => {
			const mockBrand: SyncBrandsStepBrand = {
				id: "brand_123",
				name: "Test Brand",
				handle: "test-brand",
				created_at: "2026-01-18T10:00:00.000Z",
				updated_at: "2026-01-18T10:00:00.000Z",
			}

			const mockStrapiPayload: StrapiBrandDescription = {
				documentId: "strapi_doc_1",
				medusa_brand_id: "brand_123",
				brand_name: "Test Brand",
				brand_handle: "test-brand",
				rich_description: "A detailed description",
				brand_logo: [{ url: "https://example.com/logo.png" }],
				meta_keywords: ["tech", "innovation"],
				last_synced: "2026-01-18T10:00:00.000Z",
				sync_status: "synced",
				publishedAt: "2026-01-18T10:00:00.000Z",
			}

			const input: IndexRichBrandWorkflowInput = {
				brand: mockBrand,
				strapiPayload: mockStrapiPayload,
				productCount: 10,
			}

			expect(input.brand.id).toBe("brand_123")
			expect(input.strapiPayload.rich_description).toBe("A detailed description")
			expect(input.productCount).toBe(10)
		})
	})

	describe("workflow structure", () => {
		it("should have the correct workflow name", () => {
			expect(indexRichBrandWorkflow.getName()).toBe("index-rich-brand-workflow")
		})
	})
})
