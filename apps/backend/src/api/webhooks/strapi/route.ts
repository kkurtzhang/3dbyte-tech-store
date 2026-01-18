import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncProductsWorkflow } from "../../../workflows/meilisearch"
import { syncBrandsWorkflow } from "../../../workflows/meilisearch/sync-brands"

interface StrapiWebhookBody {
	model: string
	entry: {
		id?: number
		documentId?: string
		medusa_product_id?: string
		medusa_brand_id?: string
		[key: string]: unknown
	}
	event: string
}

interface StrapiWebhookRequest extends MedusaRequest {
	body: StrapiWebhookBody
}

/**
 * POST /webhooks/strapi
 *
 * Webhook endpoint for Strapi to notify Medusa of content changes.
 *
 * When product descriptions are published in Strapi, Strapi calls this webhook
 * to trigger a re-index of the affected product in Meilisearch.
 *
 * IMPORTANT WEBHOOK CONFIGURATION:
 * ================================
 * ONLY enable "Entry publish" and "Entry unpublish" events in Strapi webhook settings.
 *
 * DO NOT enable "Entry create" - causes redundant re-indexing:
 * - When Medusa creates a product → subscriber indexes it
 * - Then Medusa syncs to Strapi (creates empty entry)
 * - If Entry create webhook fires → re-indexes same product again (redundant!)
 *
 * DO NOT enable "Entry update" - won't update Meilisearch correctly:
 * - Entry update fires when content is SAVED (draft state)
 * - Medusa fetches from Strapi API (only returns published content by default)
 * - Draft content is NOT returned, so Meilisearch re-indexes old published content
 * - Only when content is PUBLISHED does the API return the new content
 *
 * Why "Entry publish" and "Entry unpublish"?
 * - Entry publish: Content becomes live → index with full Strapi enrichment
 * - Entry unpublish: Content is unpublished → re-index with Medusa data only (product remains searchable)
 * - Draft/work-in-progress content should not appear in search results
 * - When content is unpublished, product stays searchable with base information (title, price, etc.)
 *
 * Expected payload:
 * {
 *   model: "product-descriptions",
 *   entry: {
 *     id: 1,
 *     documentId: "abc123",
 *     medusa_product_id: "prod_123",
 *     ...
 *   },
 *   event: "entry.publish" | "entry.unpublish"
 * }
 *
 * Security:
 * - Verify webhook using X-Webhook-Secret header matching STRAPI_WEBHOOK_SECRET env var
 */
export async function POST(
	req: StrapiWebhookRequest,
	res: MedusaResponse
): Promise<void> {
	const logger = req.scope.resolve("logger")

	// 1. Verify webhook secret for security
	const webhookSecret = req.headers["x-webhook-secret"] as string
	const expectedSecret = process.env.STRAPI_WEBHOOK_SECRET

	if (!expectedSecret) {
		logger.warn("STRAPI_WEBHOOK_SECRET not configured, rejecting webhook")
		res.status(500).json({
			error: "Webhook not configured on server",
			message: "STRAPI_WEBHOOK_SECRET environment variable is not set",
		})
		return
	}

	if (webhookSecret !== expectedSecret) {
		logger.warn("Invalid webhook secret received")
		res.status(401).json({ error: "Unauthorized" })
		return
	}

	// 2. Parse webhook payload
	const { model, entry, event } = req.body

	// 3. Validate this is a tracked model
	// Strapi v5 sends model as the API ID (e.g., "product-descriptions" or "api::product-description.product-description")
	const validProductModels = [
		"product-description",
		"product-descriptions",
		"api::product-description.product-description",
		"api::product-descriptions.product-descriptions",
	]
	const validBrandModels = [
		"brand-description",
		"brand-descriptions",
		"api::brand-description.brand-description",
		"api::brand-descriptions.brand-descriptions",
	]

	const isProductModel = validProductModels.includes(model)
	const isBrandModel = validBrandModels.includes(model)

	if (!isProductModel && !isBrandModel) {
		logger.info(`Ignoring webhook for model: ${model}`)
		res.json({ received: true, message: "Model not tracked" })
		return
	}

	// 4. Handle product-description webhooks
	if (isProductModel) {
		const productId = entry?.medusa_product_id

		if (!productId) {
			logger.warn("Webhook payload missing medusa_product_id")
			res.status(400).json({ error: "Invalid payload: missing medusa_product_id" })
			return
		}

		logger.info(
			`Received Strapi webhook for product ${productId} (event: ${event})`
		)

		// 5. Re-index the product with updated Strapi content using workflow
		try {
			const { result } = await syncProductsWorkflow(req.scope).run({
				input: {
					filters: {
						id: productId,
					},
				},
			})

			res.json({
				received: true,
				message: "Product re-indexed to Meilisearch",
				productId,
				indexed: result.indexed,
			})
		} catch (error) {
			// Still return 200 to avoid Strapi retrying the webhook
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			logger.error(`Failed to re-index product ${productId}: ${errorMessage}`, error)

			res.json({
				received: true,
				message: "Product indexing failed",
				productId,
				error: errorMessage,
			})
		}
		return
	}

	// 6. Handle brand-description webhooks
	if (isBrandModel) {
		const brandId = entry?.medusa_brand_id

		if (!brandId) {
			logger.warn("Webhook payload missing medusa_brand_id")
			res.status(400).json({ error: "Invalid payload: missing medusa_brand_id" })
			return
		}

		logger.info(
			`Received Strapi webhook for brand ${brandId} (event: ${event})`
		)

		// 7. Directly call syncBrandsWorkflow to index the brand
		try {
			const { result } = await syncBrandsWorkflow(req.scope).run({
				input: {
					filters: {
						id: brandId,
					},
				},
			})

			const eventName =
				event === "entry.unpublish"
					? "unpublished"
					: "published"

			res.json({
				received: true,
				message: `Brand ${eventName} and re-indexed to Meilisearch`,
				brandId,
				indexed: result.indexed,
			})
		} catch (error) {
			// Still return 200 to avoid Strapi retrying the webhook
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			logger.error(`Failed to re-index brand ${brandId}: ${errorMessage}`, error)

			res.json({
				received: true,
				message: "Brand indexing failed",
				brandId,
				error: errorMessage,
			})
		}
		return
	}
}

/**
 * GET /webhooks/strapi
 *
 * Returns information about the webhook endpoint (for discovery/testing)
 */
export async function GET(
	req: MedusaRequest,
	res: MedusaResponse
): Promise<void> {
	const isConfigured = !!process.env.STRAPI_WEBHOOK_SECRET

	res.json({
		endpoint: "/webhooks/strapi",
		method: "POST",
		description:
			"Webhook endpoint for Strapi to trigger Meilisearch re-indexing when product or brand descriptions are updated",
		configured: isConfigured,
		productWebhook: {
			examplePayload: {
				model: "product-descriptions",
				entry: {
					id: 1,
					documentId: "abc123",
					medusa_product_id: "prod_123",
					detailed_description: "<p>Updated content...</p>",
					features: ["Feature 1", "Feature 2"],
				},
				event: "entry.publish",
			},
		},
		brandWebhook: {
			examplePayload: {
				model: "brand-descriptions",
				entry: {
					id: 1,
					documentId: "xyz789",
					medusa_brand_id: "brand_456",
					tagline: "Quality gaming gear",
					story: "<p>Our brand story...</p>",
				},
				event: "entry.publish",
			},
		},
		strapiV5Config: {
			url: `${process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"}/webhooks/strapi`,
			method: "POST",
			headers: {
				"X-Webhook-Secret": process.env.STRAPI_WEBHOOK_SECRET || "your-webhook-secret",
			},
			events: ["entry.publish", "entry.unpublish"], // Use these events - see IMPORTANT notes above
			// DO NOT enable "entry.create" - causes redundant re-indexing
			// DO NOT enable "entry.update" - won't update correctly (drafts not returned by API)
			// Note: In Strapi v5, there's no "Content Types" filter - webhook receives all events
			// The handler filters by model name (product-descriptions, brand-descriptions)
		},
		networking: {
			// Docker networking reference: /docs/deployment.md#webhook-configuration-strapi--medusa
			dockerDesktop: "Use http://host.docker.internal:9000/webhooks/strapi",
			colima: "Use http://<colima-ip>:9000/webhooks/strapi (get IP: colima ssh + ip addr)",
			dockerCompose: "Use http://backend:9000/webhooks/strapi (service name)",
			production: "Use https://api.your-domain.com/webhooks/strapi",
		},
	})
}
