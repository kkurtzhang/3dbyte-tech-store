import { Modules } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

import { STRAPI_MODULE } from "../../modules/strapi"
import { mergeAiProductDraftMetadata } from "./metadata"
import { buildAiProductSnapshotHash } from "./resolution"
import {
  InternalAiProductDraftSchema,
  type InternalAiProductDraft,
} from "./schemas"

type ProductModule = {
  listProducts: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<Record<string, unknown>[]>
}

type FulfillmentModule = {
  listShippingProfiles: (
    filters: Record<string, unknown>
  ) => Promise<Record<string, unknown>[]>
}

type SalesChannelModule = {
  listSalesChannels: (
    filters: Record<string, unknown>
  ) => Promise<Record<string, unknown>[]>
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

type ImportOperation = "create" | "enrich"

type ApprovedChange = {
  path: string
  proposed_value: unknown
}

export type AiProductDraftImportTarget =
  | "medusa_product"
  | "medusa_metadata"
  | "strapi_description_draft"
  | "product_document_drafts"

type ImportProgressEntry = {
  status: "completed"
  product_id?: string
  product_handle?: string
  count?: number
}

export type AiProductDraftImportProgress = Partial<
  Record<AiProductDraftImportTarget, ImportProgressEntry>
>

type ImportableDraft = {
  id: string
  status: string
  packet_version?: number | null
  resolved_operation?: ImportOperation | null
  product_id?: string | null
  product_handle?: string | null
  product_input?: unknown
  normalized_draft?: unknown
  approved_changes?: unknown
  approved_import_targets?: unknown
  approved_snapshot_hash?: string | null
  import_progress?: unknown
}

type ImportInput = {
  container: ImportContainer
  draft: ImportableDraft
  onProgress?: (
    progress: AiProductDraftImportProgress
  ) => Promise<void> | void
}

export type AiProductDraftImportSummary = {
  operation: ImportOperation
  imported_targets: string[]
  product_id: string
  product_handle: string
  document_drafts_count: number
}

const IMPORT_TARGET_DEFAULTS = {
  medusa_metadata: true,
  strapi_description_draft: true,
  product_document_drafts: true,
}

const UNSAFE_PATH_SEGMENTS = new Set(["__proto__", "constructor", "prototype"])

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
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

function getOperation(draft: ImportableDraft): ImportOperation {
  if (
    draft.resolved_operation === "create" ||
    draft.resolved_operation === "enrich"
  ) {
    return draft.resolved_operation
  }

  return "enrich"
}

function getImportTargets(value: unknown) {
  const record = getRecord(value)

  return {
    medusa_metadata:
      typeof record.medusa_metadata === "boolean"
        ? record.medusa_metadata
        : IMPORT_TARGET_DEFAULTS.medusa_metadata,
    strapi_description_draft:
      typeof record.strapi_description_draft === "boolean"
        ? record.strapi_description_draft
        : IMPORT_TARGET_DEFAULTS.strapi_description_draft,
    product_document_drafts:
      typeof record.product_document_drafts === "boolean"
        ? record.product_document_drafts
        : IMPORT_TARGET_DEFAULTS.product_document_drafts,
  }
}

function getImportProgress(value: unknown): AiProductDraftImportProgress {
  const record = getRecord(value)
  const progress: AiProductDraftImportProgress = {}
  const targets: AiProductDraftImportTarget[] = [
    "medusa_product",
    "medusa_metadata",
    "strapi_description_draft",
    "product_document_drafts",
  ]

  for (const target of targets) {
    const entry = getRecord(record[target])

    if (entry.status === "completed") {
      progress[target] = {
        status: "completed",
        ...(getString(entry.product_id)
          ? { product_id: getString(entry.product_id) }
          : {}),
        ...(getString(entry.product_handle)
          ? { product_handle: getString(entry.product_handle) }
          : {}),
        ...(Number.isFinite(entry.count) ? { count: Number(entry.count) } : {}),
      }
    }
  }

  return progress
}

function isComplete(
  progress: AiProductDraftImportProgress,
  target: AiProductDraftImportTarget
) {
  return progress[target]?.status === "completed"
}

async function recordProgress(
  progress: AiProductDraftImportProgress,
  target: AiProductDraftImportTarget,
  entry: ImportProgressEntry,
  onProgress?: ImportInput["onProgress"]
) {
  progress[target] = entry
  await onProgress?.({ ...progress })
}

function resolveProductSelector(draft: ImportableDraft) {
  const progress = getImportProgress(draft.import_progress)
  const progressProductId = progress.medusa_product?.product_id

  if (progressProductId || draft.product_id) {
    return { id: progressProductId || draft.product_id }
  }

  if (draft.product_handle) {
    return { handle: draft.product_handle }
  }

  throw new Error("AI product draft has no target product")
}

function assertProductMatchesDraft(
  product: Record<string, unknown>,
  draft: ImportableDraft,
  normalizedDraft: InternalAiProductDraft,
  operation: ImportOperation
) {
  if (operation === "create") return

  const productId = getString(product.id)
  const productHandle = getString(product.handle)
  const targetProductId =
    normalizedDraft.target_product.product_id || draft.product_id
  const targetProductHandle =
    normalizedDraft.target_product.product_handle || draft.product_handle

  if (targetProductId && targetProductId !== productId) {
    throw new Error("AI product draft product_id does not match resolved product")
  }

  if (targetProductHandle && targetProductHandle !== productHandle) {
    throw new Error(
      "AI product draft product_handle does not match resolved product"
    )
  }
}

function getApprovedChanges(value: unknown): ApprovedChange[] | null {
  if (!Array.isArray(value)) return null

  return value.flatMap((change) => {
    const record = getRecord(change)
    const path = getString(record.path)

    return path ? [{ path, proposed_value: record.proposed_value }] : []
  })
}

function setImmutablePath(
  root: Record<string, unknown>,
  segments: string[],
  value: unknown
): Record<string, unknown> {
  if (!segments.length) return root

  const [segment, ...rest] = segments
  if (
    !/^[a-zA-Z0-9_]+$/.test(segment) ||
    UNSAFE_PATH_SEGMENTS.has(segment)
  ) {
    throw new Error(`Unsafe approved metadata path segment: ${segment}`)
  }

  if (!rest.length) {
    return {
      ...root,
      [segment]: value,
    }
  }

  return {
    ...root,
    [segment]: setImmutablePath(getRecord(root[segment]), rest, value),
  }
}

function buildApprovedMetadata(
  currentMetadata: unknown,
  normalizedDraft: InternalAiProductDraft,
  approvedChanges: ApprovedChange[] | null
) {
  if (approvedChanges === null) {
    return mergeAiProductDraftMetadata(
      currentMetadata,
      normalizedDraft.metadata
    )
  }

  return approvedChanges.reduce<Record<string, unknown>>(
    (metadata, change) => {
      const segments = change.path.split(".")

      if (segments.shift() !== "metadata" || !segments.length) {
        throw new Error(
          `Approved product changes may only update metadata paths: ${change.path}`
        )
      }

      return setImmutablePath(metadata, segments, change.proposed_value)
    },
    { ...getRecord(currentMetadata) }
  )
}

function buildProductSnapshot(product: Record<string, unknown>) {
  return {
    id: getString(product.id),
    handle: getString(product.handle) || null,
    title: getString(product.title) || null,
    metadata: getRecord(product.metadata),
  }
}

function assertApprovedSnapshotIsCurrent(
  product: Record<string, unknown>,
  draft: ImportableDraft,
  operation: ImportOperation,
  progress: AiProductDraftImportProgress
) {
  if (operation !== "enrich" || isComplete(progress, "medusa_metadata")) {
    return
  }

  const approvedHash = getString(draft.approved_snapshot_hash)

  if (!approvedHash) {
    if (draft.packet_version === 2 || draft.resolved_operation === "enrich") {
      throw new Error("AI product enrichment has no approved product snapshot")
    }
    return
  }

  const currentHash = buildAiProductSnapshotHash(buildProductSnapshot(product))

  if (currentHash !== approvedHash) {
    throw new Error(
      "The target product changed after approval; resolve and approve the draft again"
    )
  }
}

async function getDefaultShippingProfileId(container: ImportContainer) {
  const fulfillmentModule = container.resolve(
    Modules.FULFILLMENT
  ) as FulfillmentModule
  const profiles = await fulfillmentModule.listShippingProfiles({
    type: "default",
  })
  const id = getString(profiles[0]?.id)

  if (!id) {
    throw new Error(
      "Cannot create product draft: no default shipping profile is configured"
    )
  }

  return id
}

async function getSalesChannelId(container: ImportContainer) {
  const salesChannelModule = container.resolve(
    Modules.SALES_CHANNEL
  ) as SalesChannelModule
  const channels = await salesChannelModule.listSalesChannels({})
  const enabledChannels = channels.filter(
    (channel) => channel.is_disabled !== true
  )
  const preferred =
    enabledChannels.find((channel) =>
      ["web store", "default sales channel"].includes(
        getString(channel.name).toLowerCase()
      )
    ) ||
    enabledChannels.find((channel) =>
      getString(channel.name).toLowerCase().includes("store")
    ) ||
    enabledChannels[0]
  const id = getString(preferred?.id)

  if (!id) {
    throw new Error(
      "Cannot create product draft: no enabled sales channel is configured"
    )
  }

  return id
}

function getCreateProductTitle(
  draft: ImportableDraft,
  normalizedDraft: InternalAiProductDraft
) {
  const productInput = getRecord(draft.product_input)
  const title = stripUnsafeHtml(
    normalizedDraft.target_product.product_title ||
      getString(productInput.product_name)
  )

  if (!title) {
    throw new Error("Cannot create product draft without a product title")
  }

  return title
}

async function createProductShell(
  container: ImportContainer,
  draft: ImportableDraft,
  normalizedDraft: InternalAiProductDraft,
  metadata: Record<string, unknown>
) {
  const [shippingProfileId, salesChannelId] = await Promise.all([
    getDefaultShippingProfileId(container),
    getSalesChannelId(container),
  ])
  const title = getCreateProductTitle(draft, normalizedDraft)
  const { result } = await createProductsWorkflow(container as never).run({
    input: {
      products: [
        {
          title,
          status: "draft",
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              options: { Default: "Default" },
              manage_inventory: false,
            },
          ],
          ...(Object.keys(metadata).length ? { metadata } : {}),
        },
      ],
    },
  })
  const product = (Array.isArray(result) ? result[0] : null) as
    | Record<string, unknown>
    | null

  if (!product || !getString(product.id)) {
    throw new Error("Medusa did not return the created draft product")
  }

  return product
}

async function loadExistingProduct(
  productModule: ProductModule,
  draft: ImportableDraft
) {
  const [product] = await productModule.listProducts(
    resolveProductSelector(draft),
    {
      take: 1,
    }
  )

  if (!product) {
    throw new Error("AI product draft target product was not found")
  }

  return product
}

export async function importAiProductDraft({
  container,
  draft,
  onProgress,
}: ImportInput): Promise<AiProductDraftImportSummary> {
  if (draft.status !== "approved") {
    throw new Error("Only approved AI product drafts can be imported")
  }

  const operation = getOperation(draft)
  const normalizedDraft = InternalAiProductDraftSchema.parse(
    draft.normalized_draft
  )
  const approvedChanges = getApprovedChanges(draft.approved_changes)
  const importTargets = getImportTargets(draft.approved_import_targets)
  const progress = getImportProgress(draft.import_progress)
  const productModule = container.resolve(Modules.PRODUCT) as ProductModule
  let product: Record<string, unknown>

  if (operation === "create" && !isComplete(progress, "medusa_product")) {
    const metadata = importTargets.medusa_metadata
      ? buildApprovedMetadata({}, normalizedDraft, approvedChanges)
      : {}
    product = await createProductShell(
      container,
      draft,
      normalizedDraft,
      metadata
    )
    const productId = getString(product.id)
    const productHandle = getString(product.handle)

    await recordProgress(
      progress,
      "medusa_product",
      {
        status: "completed",
        product_id: productId,
        product_handle: productHandle,
      },
      onProgress
    )

    if (importTargets.medusa_metadata) {
      await recordProgress(
        progress,
        "medusa_metadata",
        { status: "completed" },
        onProgress
      )
    }
  } else {
    product = await loadExistingProduct(productModule, draft)
  }

  assertProductMatchesDraft(product, draft, normalizedDraft, operation)
  assertApprovedSnapshotIsCurrent(product, draft, operation, progress)

  const productId = getString(product.id)
  const productHandle =
    getString(product.handle) || draft.product_handle || ""
  const productTitle =
    getString(product.title) ||
    normalizedDraft.target_product.product_title ||
    ""

  if (
    operation === "enrich" &&
    importTargets.medusa_metadata &&
    !isComplete(progress, "medusa_metadata")
  ) {
    const metadata = buildApprovedMetadata(
      product.metadata,
      normalizedDraft,
      approvedChanges
    )

    await updateProductsWorkflow(container as never).run({
      input: {
        products: [{ id: productId, metadata }],
      },
    })
    await recordProgress(
      progress,
      "medusa_metadata",
      { status: "completed" },
      onProgress
    )
  }

  let strapiModule: StrapiDraftModule | null = null
  const getStrapiModule = () => {
    strapiModule ||= container.resolve(STRAPI_MODULE) as StrapiDraftModule
    return strapiModule
  }

  if (
    importTargets.strapi_description_draft &&
    !isComplete(progress, "strapi_description_draft")
  ) {
    await getStrapiModule().upsertAiProductDescriptionDraft({
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
    await recordProgress(
      progress,
      "strapi_description_draft",
      { status: "completed" },
      onProgress
    )
  }

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

  if (
    importTargets.product_document_drafts &&
    !isComplete(progress, "product_document_drafts")
  ) {
    if (documentDrafts.length) {
      await getStrapiModule().upsertAiProductDocumentDrafts(
        productId,
        documentDrafts
      )
    }
    await recordProgress(
      progress,
      "product_document_drafts",
      { status: "completed", count: documentDrafts.length },
      onProgress
    )
  }

  const importedTargets: AiProductDraftImportTarget[] = [
    ...(isComplete(progress, "medusa_product")
      ? (["medusa_product"] as const)
      : []),
    ...(isComplete(progress, "medusa_metadata")
      ? (["medusa_metadata"] as const)
      : []),
    ...(isComplete(progress, "strapi_description_draft")
      ? (["strapi_description_draft"] as const)
      : []),
    ...(isComplete(progress, "product_document_drafts") &&
    documentDrafts.length
      ? (["product_document_drafts"] as const)
      : []),
  ]

  return {
    operation,
    imported_targets: importedTargets,
    product_id: productId,
    product_handle: productHandle,
    document_drafts_count: documentDrafts.length,
  }
}
