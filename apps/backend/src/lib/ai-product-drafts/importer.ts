import { Modules } from "@medusajs/framework/utils"

import {
  InternalAiProductDraftSchema,
  type InternalAiProductDraft,
} from "./schemas"
import { mergeAiProductDraftMetadata } from "./metadata"
import { STRAPI_MODULE } from "../../modules/strapi"

type ProductModule = {
  listProducts: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<Record<string, unknown>[]>
  updateProducts: (
    id: string,
    data: Record<string, unknown>
  ) => Promise<Record<string, unknown>>
}

type StrapiDraftModule = {
  upsertAiProductDescriptionDraft: (
    input: Record<string, unknown>
  ) => Promise<unknown>
  upsertAiProductDocumentDrafts: (
    medusaProductId: string,
    documents: Record<string, unknown>[]
  ) => Promise<unknown>
}

type ImportContainer = {
  resolve: (key: string) => unknown
}

type ImportableDraft = {
  id: string
  status: string
  product_id?: string | null
  product_handle?: string | null
  normalized_draft?: unknown
}

type ImportInput = {
  container: ImportContainer
  draft: ImportableDraft
}

export type AiProductDraftImportSummary = {
  imported_targets: string[]
  product_id: string
  product_handle: string
  document_drafts_count: number
}

function stripUnsafeHtml(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function sanitizeList(values: string[]) {
  return values.map(stripUnsafeHtml).filter(Boolean)
}

function resolveProductSelector(draft: ImportableDraft) {
  if (draft.product_id) {
    return { id: draft.product_id }
  }

  if (draft.product_handle) {
    return { handle: draft.product_handle }
  }

  throw new Error("AI product draft has no target product")
}

function assertProductMatchesDraft(
  product: Record<string, unknown>,
  draft: ImportableDraft,
  normalizedDraft: InternalAiProductDraft
) {
  const productId = String(product.id || "")
  const productHandle = String(product.handle || "")
  const targetProductId = normalizedDraft.target_product.product_id || draft.product_id
  const targetProductHandle =
    normalizedDraft.target_product.product_handle || draft.product_handle

  if (targetProductId && targetProductId !== productId) {
    throw new Error("AI product draft product_id does not match resolved product")
  }

  if (targetProductHandle && targetProductHandle !== productHandle) {
    throw new Error("AI product draft product_handle does not match resolved product")
  }
}

export async function importAiProductDraft({
  container,
  draft,
}: ImportInput): Promise<AiProductDraftImportSummary> {
  if (draft.status !== "approved") {
    throw new Error("Only approved AI product drafts can be imported")
  }

  const normalizedDraft = InternalAiProductDraftSchema.parse(
    draft.normalized_draft
  )
  const productModule = container.resolve(Modules.PRODUCT) as ProductModule
  const strapiModule = container.resolve(STRAPI_MODULE) as StrapiDraftModule
  const [product] = await productModule.listProducts(resolveProductSelector(draft), {
    take: 1,
  })

  if (!product) {
    throw new Error("AI product draft target product was not found")
  }

  assertProductMatchesDraft(product, draft, normalizedDraft)

  const productId = String(product.id)
  const productHandle = String(product.handle || draft.product_handle || "")
  const productTitle = String(product.title || normalizedDraft.target_product.product_title || "")
  const importedTargets: string[] = []

  await productModule.updateProducts(productId, {
    metadata: mergeAiProductDraftMetadata(
      product.metadata,
      normalizedDraft.metadata
    ),
  })
  importedTargets.push("medusa_metadata")

  await strapiModule.upsertAiProductDescriptionDraft({
    medusa_product_id: productId,
    product_title: productTitle,
    product_handle: productHandle,
    rich_description: stripUnsafeHtml(
      normalizedDraft.content_draft.short_description
    ),
    features: sanitizeList(normalizedDraft.content_draft.feature_bullets),
    specifications: {},
    seo_title: stripUnsafeHtml(normalizedDraft.content_draft.seo_title),
    seo_description: stripUnsafeHtml(
      normalizedDraft.content_draft.seo_description
    ),
    meta_keywords: sanitizeList(
      normalizedDraft.content_draft.ai_search_keywords
    ),
  })
  importedTargets.push("strapi_description_draft")

  const documentDrafts = normalizedDraft.product_document_suggestions
    .filter((document) => document.source_url.startsWith("https://"))
    .map((document) => ({
      medusa_product_id: productId,
      product_title: productTitle,
      product_handle: productHandle,
      title: stripUnsafeHtml(document.title),
      document_type: document.document_type,
      source_url: document.source_url,
      source_kind: document.source_kind,
      source_label: stripUnsafeHtml(document.source_label),
      source_checked_at: document.source_checked_at,
      search_keywords: sanitizeList(document.search_keywords),
      is_public: false,
    }))

  if (documentDrafts.length) {
    await strapiModule.upsertAiProductDocumentDrafts(productId, documentDrafts)
    importedTargets.push("product_document_drafts")
  }

  return {
    imported_targets: importedTargets,
    product_id: productId,
    product_handle: productHandle,
    document_drafts_count: documentDrafts.length,
  }
}
