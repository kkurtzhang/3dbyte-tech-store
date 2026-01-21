import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncProductsWorkflow } from "../../../workflows/meilisearch"
import { indexRichBrandWorkflow } from "../../../workflows/meilisearch/index-rich-brand-workflow"
import { indexBasicBrandWorkflow } from "../../../workflows/meilisearch/index-basic-brand-workflow"
import { deleteBrandWorkflow } from "../../../workflows/meilisearch/delete-brand-workflow"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import type {
	SyncBrandsStepBrand,
	StrapiBrandDescription,
} from "@3dbyte-tech-store/shared-types"
import type { MedusaContainer } from "@medusajs/framework/types"

/**
 * Calculate the product count for a single brand using the Medusa link system
 */
async function getProductCountForBrand(
	brandId: string,
	container: MedusaContainer
): Promise<number> {
	const link = container.resolve("link")
	const logger = container.resolve("logger")

	try {
		const links = await link.list({
			[BRAND_MODULE]: {
				brand_id: [brandId],
			},
		})
		const count = links.length
		logger.info(`Calculated product count for brand ${brandId}: ${count}`)
		return count
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error"
		logger.warn(
			`Failed to query product count for brand ${brandId}: ${message}, defaulting to 0`
		)
		return 0
	}
}

interface StrapiWebhookBody {
	model: string
	entry: {
		id?: number
		documentId?: string
		medusa_product_id?: string
		medusa_brand_id?: string
		brand_name?: string
		brand_handle?: string
		detailed_description?: string
		brand_logo?: Array<{ url: string }>
		meta_keywords?: string[]
		last_synced?: string
		sync_status?: string
		publishedAt?: string
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
 * BRAND WEBHOOK EVENTS:
 * =====================
 * - entry.publish: Index rich brand data (with Strapi enrichment) using Workflow C
 * - entry.unpublish: Re-index basic brand data only (removes rich content) using Workflow A
 * - entry.delete: Remove brand from Meilisearch using Workflow D (safety fallback)
 *
 * PRODUCT WEBHOOK EVENTS:
 * =======================
 * - entry.publish: Re-index product with Strapi content
 * - entry.unpublish: Re-index product with Medusa data only
 *
 * IMPORTANT WEBHOOK CONFIGURATION:
 * ================================
 * ONLY enable "Entry publish", "Entry unpublish", and "Entry delete" events.
 *
 * DO NOT enable "Entry create" - causes redundant re-indexing:
 * - When Medusa creates a brand → subscriber indexes it
 * - Then Medusa syncs to Strapi (creates empty entry)
 * - If Entry create webhook fires → re-indexes same brand again (redundant!)
 *
 * DO NOT enable "Entry update" - won't update Meilisearch correctly:
 * - Entry update fires when content is SAVED (draft state)
 * - Medusa fetches from Strapi API (only returns published content by default)
 * - Draft content is NOT returned, so Meilisearch re-indexes old published content
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

	// 5. Handle brand-description webhooks
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

		try {
			// Fetch brand data from Medusa
			const brandModuleService: BrandModuleService =
				req.scope.resolve(BRAND_MODULE)
			const brand = await brandModuleService.retrieveBrand(brandId)

			if (!brand) {
				logger.warn(`Brand ${brandId} not found in Medusa`)
				res.status(404).json({ error: `Brand ${brandId} not found` })
				return
			}

			const brandData: SyncBrandsStepBrand = {
				id: brand.id,
				name: brand.name,
				handle: brand.handle,
				created_at: typeof brand.created_at === 'string' ? brand.created_at : brand.created_at.toISOString(),
				updated_at: typeof brand.updated_at === 'string' ? brand.updated_at : brand.updated_at.toISOString(),
			}

			// Handle different webhook events
			if (event === "entry.publish") {
				// Workflow C: Index rich brand data with Strapi enrichment
				const strapiPayload: StrapiBrandDescription = {
					documentId: entry.documentId || "",
					medusa_brand_id: brandId,
					brand_name: entry.brand_name || brand.name,
					brand_handle: entry.brand_handle || brand.handle,
					detailed_description: entry.detailed_description || "",
					brand_logo: entry.brand_logo || [],
					meta_keywords: entry.meta_keywords || [],
					last_synced: entry.last_synced || new Date().toISOString(),
					sync_status: (entry.sync_status as "synced" | "outdated" | "pending") || "synced",
					publishedAt: entry.publishedAt || new Date().toISOString(),
				}

				// Calculate actual product count using link service
				const productCount = await getProductCountForBrand(brandId, req.scope)

				const { result } = await indexRichBrandWorkflow(req.scope).run({
					input: {
						brand: brandData,
						strapiPayload,
						productCount,
					},
				})

				res.json({
					received: true,
					message: "Brand published and indexed with rich content",
					brandId,
					indexed: result.indexed,
				})
			} else if (event === "entry.unpublish") {
				// Workflow A: Re-index with basic data only (removes rich content)
				const { result } = await indexBasicBrandWorkflow(req.scope).run({
					input: { brand: brandData },
				})

				res.json({
					received: true,
					message: "Brand unpublished - re-indexed with basic data only",
					brandId,
					indexed: result.indexed,
				})
			} else if (event === "entry.delete") {
				// Workflow D: Delete from Meilisearch (safety fallback)
				// Note: Normally brand deletion is handled by Medusa's brand.deleted event
				const { result } = await deleteBrandWorkflow(req.scope).run({
					input: { brandId },
				})

				res.json({
					received: true,
					message: "Brand deleted from Meilisearch",
					brandId,
					deleted: result.deleted,
				})
			} else {
				logger.info(`Ignoring unhandled brand event: ${event}`)
				res.json({
					received: true,
					message: `Event ${event} not handled`,
					brandId,
				})
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			logger.error(`Failed to process brand ${brandId}: ${errorMessage}`, error)

			res.json({
				received: true,
				message: "Brand processing failed",
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
			supportedEvents: ["entry.publish", "entry.unpublish", "entry.delete"],
			examplePayload: {
				model: "brand-descriptions",
				entry: {
					id: 1,
					documentId: "xyz789",
					medusa_brand_id: "brand_456",
					brand_name: "Acme Corp",
					brand_handle: "acme-corp",
					detailed_description: "<p>Our brand story...</p>",
					brand_logo: [{ url: "https://example.com/logo.png" }],
					meta_keywords: ["quality", "innovation"],
				},
				event: "entry.publish",
			},
			eventBehavior: {
				"entry.publish": "Index brand with rich Strapi content (Workflow C)",
				"entry.unpublish": "Re-index with basic data only (Workflow A)",
				"entry.delete": "Delete from Meilisearch (Workflow D - safety fallback)",
			},
		},
		strapiV5Config: {
			url: `${process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"}/webhooks/strapi`,
			method: "POST",
			headers: {
				"X-Webhook-Secret": process.env.STRAPI_WEBHOOK_SECRET || "your-webhook-secret",
			},
			events: ["entry.publish", "entry.unpublish", "entry.delete"],
		},
		networking: {
			dockerDesktop: "Use http://host.docker.internal:9000/webhooks/strapi",
			colima: "Use http://<colima-ip>:9000/webhooks/strapi (get IP: colima ssh + ip addr)",
			dockerCompose: "Use http://backend:9000/webhooks/strapi (service name)",
			production: "Use https://api.your-domain.com/webhooks/strapi",
		},
	})
}
