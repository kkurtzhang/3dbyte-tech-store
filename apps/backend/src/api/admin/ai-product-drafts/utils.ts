import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  ProductResearchPacketSchema,
  type ProductResearchPacket,
} from "../../../lib/ai-product-drafts/schemas"
import {
  normalizeProductResearchPacketForDraft,
  resolveAiProductDraftNormalizerProvider,
} from "../../../lib/ai-product-drafts/normalizer"
import { sendAiProductDraftAdminNotification } from "../../../lib/ai-product-drafts/notifications"
import {
  buildAiProductDraftChangeSet,
  buildAiProductSnapshotHash,
  resolveAiProductDraftOperation,
  type AiProductDraftCandidate,
  type AiProductDraftOperation,
  type AiProductDraftRequestedOperation,
} from "../../../lib/ai-product-drafts/resolution"
import { AI_PRODUCT_DRAFT_MODULE } from "../../../modules/ai-product-draft"
import { buildAiProductDraftEvent } from "../../../modules/ai-product-draft/lifecycle"

export type AiProductDraftModule = {
  createAiProductDrafts: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateAiProductDrafts: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
  softDeleteAiProductDrafts: (
    input: string | string[] | Record<string, unknown>
  ) => Promise<unknown>
  listAiProductDrafts: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<Record<string, unknown>[]>
  createAiProductDraftEvents: (
    input: Record<string, unknown>
  ) => Promise<Record<string, unknown>>
  listAiProductDraftEvents: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<Record<string, unknown>[]>
}

type QueryGraph = {
  graph: (input: Record<string, unknown>) => Promise<{ data: Record<string, unknown>[] }>
}

export function getAiProductDraftModule(req: MedusaRequest): AiProductDraftModule {
  return req.scope.resolve(AI_PRODUCT_DRAFT_MODULE) as AiProductDraftModule
}

export function parseLimit(value: unknown, defaultValue = 20): number {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  if (Number.isNaN(parsed) || parsed <= 0) return defaultValue

  return Math.min(parsed, 100)
}

export function parseOffset(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export async function getDraftById(req: MedusaRequest, res: MedusaResponse) {
  const draftModule = getAiProductDraftModule(req)
  const [draft] = await draftModule.listAiProductDrafts({ id: req.params.id })

  if (!draft) {
    res.status(404).json({ error: "AI product draft not found" })
    return null
  }

  return draft
}

function normalizeIdentity(value: unknown): string {
  return getString(value).toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function getCandidateIdentityValues(candidate: AiProductDraftCandidate): string[] {
  const metadata = getRecord(candidate.metadata)
  const identity = getRecord(metadata.product_contract_identity)

  return [
    candidate.title,
    candidate.handle,
    metadata.manufacturer_part_number,
    metadata.gtin,
    metadata.supplier_sku,
    identity.manufacturer_part_number,
    identity.gtin,
    identity.supplier_sku,
  ]
    .map(normalizeIdentity)
    .filter(Boolean)
}

function isStrongIdentityMatch(
  packet: ProductResearchPacket,
  candidate: AiProductDraftCandidate
) {
  const productInput = getRecord(packet.product_input)
  const submittedIdentities = [
    productInput.product_name,
    productInput.manufacturer_part_number,
    productInput.gtin,
    productInput.supplier_sku,
  ]
    .map(normalizeIdentity)
    .filter(Boolean)
  const candidateIdentities = new Set(getCandidateIdentityValues(candidate))

  return submittedIdentities.some((identity) => candidateIdentities.has(identity))
}

function toProductCandidate(
  value: Record<string, unknown>
): AiProductDraftCandidate | null {
  const id = getString(value.id)

  if (!id) return null

  return {
    id,
    handle: getString(value.handle) || null,
    title: getString(value.title) || null,
    metadata: getRecord(value.metadata),
  } satisfies AiProductDraftCandidate
}

async function resolveProductCandidates(
  req: MedusaRequest,
  packet: ProductResearchPacket
): Promise<AiProductDraftCandidate[]> {
  const productId = packet.product_id?.trim()
  const productHandle = packet.product_handle?.trim()
  const query = req.scope.resolve("query") as QueryGraph
  const productInput = getRecord(packet.product_input)
  const searchTerms = productId || productHandle
    ? []
    : [
        productInput.product_name,
        productInput.manufacturer_part_number,
        productInput.gtin,
        productInput.supplier_sku,
      ]
        .map(getString)
        .filter((value, index, values) => value && values.indexOf(value) === index)
        .slice(0, 4)
  const responses =
    productId || productHandle
      ? [
          await query.graph({
            entity: "product",
            fields: ["id", "handle", "title", "metadata"],
            filters: {
              ...(productId ? { id: productId } : {}),
              ...(productHandle ? { handle: productHandle } : {}),
            },
            pagination: { take: 1 },
          }),
        ]
      : await Promise.all(
          searchTerms.map((q) =>
            query.graph({
              entity: "product",
              fields: ["id", "handle", "title", "metadata"],
              filters: { q },
              pagination: { take: 10 },
            })
          )
        )
  const data = responses.flatMap((response) => response.data)
  const candidates = data
    .map(toProductCandidate)
    .filter(
      (candidate): candidate is AiProductDraftCandidate => candidate !== null
    )
    .filter(
      (candidate, index, values) =>
        values.findIndex((value) => value.id === candidate.id) === index
    )

  return productId || productHandle
    ? candidates
    : candidates.filter((candidate) => isStrongIdentityMatch(packet, candidate))
}

export async function getCurrentProductCandidate(
  req: MedusaRequest,
  productId: string
): Promise<AiProductDraftCandidate | null> {
  const query = req.scope.resolve("query") as QueryGraph
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "metadata"],
    filters: { id: productId },
    pagination: { take: 1 },
  })

  return data[0] ? toProductCandidate(data[0]) : null
}

export function buildResolvedDraftState(input: {
  operation: AiProductDraftOperation
  target: AiProductDraftCandidate | null
  normalized_draft: Record<string, unknown>
}) {
  const target = input.target
  const currentSnapshot =
    input.operation === "enrich" && target
      ? {
          id: target.id,
          handle: target.handle || null,
          title: target.title || null,
          metadata: getRecord(target.metadata),
        }
      : null
  const normalizedTarget = {
    ...getRecord(input.normalized_draft.target_product),
    product_id: target?.id || undefined,
    product_handle: target?.handle || undefined,
    product_title:
      target?.title ||
      getString(getRecord(input.normalized_draft.target_product).product_title) ||
      undefined,
  }
  const normalizedDraft = {
    ...input.normalized_draft,
    target_product: normalizedTarget,
  }
  const comparisonTarget =
    target || ({ id: "__new_product__", metadata: {} } satisfies AiProductDraftCandidate)

  return {
    normalizedDraft,
    currentSnapshot,
    snapshotHash: currentSnapshot
      ? buildAiProductSnapshotHash(currentSnapshot)
      : null,
    proposedChanges: buildAiProductDraftChangeSet({
      current_product: comparisonTarget,
      normalized_draft: normalizedDraft,
    }),
    productId: target?.id || null,
    productHandle: target?.handle || null,
  }
}

function formatValidationErrors(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown[] }).issues)
  ) {
    return (error as { issues: { path?: unknown[]; message?: string }[] }).issues.map(
      (issue) => ({
        path: issue.path?.join(".") || "",
        message: issue.message || "Invalid value",
      })
    )
  }

  return [{ path: "", message: "Invalid Product Research Packet" }]
}

function formatNormalizerErrors(error: unknown) {
  const errors = formatValidationErrors(error)

  if (errors.length === 1 && errors[0].message === "Invalid Product Research Packet") {
    return [
      {
        path: "normalizer",
        message:
          error instanceof Error
            ? error.message
            : "AI product draft normalizer failed",
      },
    ]
  }

  return errors.map((entry) => ({
    path: entry.path ? `normalized_draft.${entry.path}` : "normalized_draft",
    message: entry.message,
  }))
}

function hasPostgresUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false

  const record = error as { code?: unknown; cause?: unknown; message?: unknown }
  return (
    record.code === "23505" ||
    hasPostgresUniqueViolation(record.cause) ||
    (typeof record.message === "string" &&
      record.message.toLowerCase().includes("duplicate key"))
  )
}

async function createHermesDraftIdempotently(
  draftModule: AiProductDraftModule,
  packet: ProductResearchPacket,
  input: Record<string, unknown>
): Promise<{ draft: Record<string, unknown>; duplicate: boolean }> {
  try {
    return {
      draft: await draftModule.createAiProductDrafts(input),
      duplicate: false,
    }
  } catch (error) {
    if (packet.packet_version !== 2 || !hasPostgresUniqueViolation(error)) {
      throw error
    }

    const [existingDraft] = await draftModule.listAiProductDrafts({
      source_agent: packet.source_agent,
      request_id: packet.request_id,
    })

    if (!existingDraft) throw error

    return { draft: existingDraft, duplicate: true }
  }
}

export async function createDraftFromHermesPacket(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const draftModule = getAiProductDraftModule(req)
  const parsedPacket = ProductResearchPacketSchema.safeParse(req.body)
  const now = new Date().toISOString()

  if (!parsedPacket.success) {
    const validationErrors = formatValidationErrors(parsedPacket.error)
    const draft = await draftModule.createAiProductDrafts({
      status: "validation_failed",
      packet_version: 1,
      source_agent: "hermes",
      raw_packet: req.body,
      validation_errors: validationErrors,
      warnings: ["Packet failed schema validation"],
      normalizer: "deterministic",
    })

    await draftModule.createAiProductDraftEvents(
      buildAiProductDraftEvent({
        draft_id: String(draft.id),
        type: "validation_failed",
        actor_type: "hermes",
        from_status: "received",
        to_status: "validation_failed",
        metadata: { validation_errors: validationErrors },
      })
    )
    await sendAiProductDraftAdminNotification(req.scope as never, {
      kind: "validation_failed",
      draft_id: String(draft.id),
      validation_error_count: validationErrors.length,
    })

    return res.status(201).json({ draft })
  }

  const packet = parsedPacket.data
  const isV2 = packet.packet_version === 2

  if (isV2) {
    const [existingDraft] = await draftModule.listAiProductDrafts({
      source_agent: packet.source_agent,
      request_id: packet.request_id,
    })

    if (existingDraft) {
      return res.status(200).json({ draft: existingDraft, duplicate: true })
    }
  }

  if (!isV2 && !packet.product_id && !packet.product_handle) {
    const validationErrors = [
      {
        path: "product",
        message:
          "Targetless packets require packet_version 2 with requested_operation and request_id",
      },
    ]
    const creation = await createHermesDraftIdempotently(draftModule, packet, {
      status: "validation_failed",
      packet_version: packet.packet_version,
      source_agent: packet.source_agent,
      product_id: null,
      product_handle: null,
      product_input: packet.product_input,
      source_summary: packet.source_summary,
      raw_packet: packet,
      sources: packet.sources,
      validation_errors: validationErrors,
      warnings: validationErrors.map(({ message }) => message),
      normalizer: "deterministic",
    })
    const draft = creation.draft

    await draftModule.createAiProductDraftEvents(
      buildAiProductDraftEvent({
        draft_id: String(draft.id),
        type: "validation_failed",
        actor_type: "hermes",
        from_status: "received",
        to_status: "validation_failed",
        metadata: { validation_errors: validationErrors },
      })
    )
    await sendAiProductDraftAdminNotification(req.scope as never, {
      kind: "validation_failed",
      draft_id: String(draft.id),
      validation_error_count: validationErrors.length,
    })

    return res.status(201).json({ draft })
  }

  const candidates = await resolveProductCandidates(req, packet)
  const requestedOperation: AiProductDraftRequestedOperation = isV2
    ? packet.requested_operation
    : "enrich"
  const resolution = resolveAiProductDraftOperation({
    requested_operation: requestedOperation,
    product_id: packet.product_id,
    product_handle: packet.product_handle,
    candidates,
  })

  if (resolution.resolution_status === "validation_failed") {
    const validationErrors = [
      {
        path: "product",
        message:
          requestedOperation === "enrich"
            ? "No existing product matches this enrichment packet"
            : "Provided product_id/product_handle does not match an existing product",
      },
    ]
    const creation = await createHermesDraftIdempotently(draftModule, packet, {
      status: "validation_failed",
      packet_version: packet.packet_version,
      source_agent: packet.source_agent,
      request_id: isV2 ? packet.request_id : null,
      requested_operation: requestedOperation,
      resolution_status: "validation_failed",
      identity_candidates: candidates,
      product_id: packet.product_id || null,
      product_handle: packet.product_handle || null,
      product_input: packet.product_input,
      source_summary: packet.source_summary,
      raw_packet: packet,
      sources: packet.sources,
      validation_errors: validationErrors,
      warnings: validationErrors.map(({ message }) => message),
      normalizer: "deterministic",
    })
    if (creation.duplicate) {
      return res.status(200).json({ draft: creation.draft, duplicate: true })
    }
    const draft = creation.draft

    await draftModule.createAiProductDraftEvents(
      buildAiProductDraftEvent({
        draft_id: String(draft.id),
        type: "validation_failed",
        actor_type: "hermes",
        from_status: "received",
        to_status: "validation_failed",
        metadata: {
          validation_errors: validationErrors,
          resolution_reason: resolution.reason,
        },
      })
    )
    await sendAiProductDraftAdminNotification(req.scope as never, {
      kind: "validation_failed",
      draft_id: String(draft.id),
      product_id: packet.product_id,
      product_handle: packet.product_handle,
      validation_error_count: validationErrors.length,
    })

    return res.status(201).json({ draft })
  }

  let normalization

  try {
    normalization = await normalizeProductResearchPacketForDraft(packet)
  } catch (error) {
    const validationErrors = formatNormalizerErrors(error)
    const normalizerProvider = resolveAiProductDraftNormalizerProvider()
    const creation = await createHermesDraftIdempotently(draftModule, packet, {
      status: "validation_failed",
      packet_version: packet.packet_version,
      source_agent: packet.source_agent,
      request_id: isV2 ? packet.request_id : null,
      requested_operation: requestedOperation,
      resolution_status: resolution.resolution_status,
      identity_candidates: candidates,
      product_id: packet.product_id || null,
      product_handle: packet.product_handle || null,
      product_input: packet.product_input,
      source_summary: packet.source_summary,
      raw_packet: packet,
      sources: packet.sources,
      validation_errors: validationErrors,
      warnings: ["AI product draft normalizer failed validation"],
      normalizer: normalizerProvider,
    })
    if (creation.duplicate) {
      return res.status(200).json({ draft: creation.draft, duplicate: true })
    }
    const draft = creation.draft

    await draftModule.createAiProductDraftEvents(
      buildAiProductDraftEvent({
        draft_id: String(draft.id),
        type: "validation_failed",
        actor_type: "hermes",
        from_status: "received",
        to_status: "validation_failed",
        metadata: { validation_errors: validationErrors },
      })
    )
    await sendAiProductDraftAdminNotification(req.scope as never, {
      kind: "validation_failed",
      draft_id: String(draft.id),
      product_id: packet.product_id,
      product_handle: packet.product_handle,
      validation_error_count: validationErrors.length,
    })

    return res.status(201).json({ draft })
  }

  const operation = resolution.operation
  const resolvedState = operation
    ? buildResolvedDraftState({
        operation,
        target: resolution.target,
        normalized_draft: normalization.draft,
      })
    : null
  const needsResolution = resolution.resolution_status === "needs_resolution"
  const normalizedDraft = resolvedState?.normalizedDraft || normalization.draft
  const creation = await createHermesDraftIdempotently(draftModule, packet, {
    status: needsResolution ? "needs_resolution" : "needs_review",
    packet_version: packet.packet_version,
    source_agent: packet.source_agent,
    request_id: isV2 ? packet.request_id : null,
    requested_operation: requestedOperation,
    resolved_operation: operation,
    resolution_status: resolution.resolution_status,
    identity_candidates: candidates,
    product_id: resolvedState?.productId || null,
    product_handle: resolvedState?.productHandle || null,
    product_input: packet.product_input,
    source_summary: packet.source_summary,
    raw_packet: packet,
    normalized_draft: normalizedDraft,
    current_snapshot: resolvedState?.currentSnapshot || null,
    snapshot_hash: resolvedState?.snapshotHash || null,
    proposed_changes: resolvedState?.proposedChanges || [],
    sources: packet.sources,
    warnings: normalizedDraft.warnings,
    confidence_summary: normalizedDraft.confidence_summary,
    normalizer: normalization.normalizer,
    normalizer_trace_id: normalization.trace_id || null,
  })
  if (creation.duplicate) {
    return res.status(200).json({ draft: creation.draft, duplicate: true })
  }
  const draft = creation.draft

  await draftModule.createAiProductDraftEvents(
    buildAiProductDraftEvent({
      draft_id: String(draft.id),
      type: needsResolution ? "identity_resolution_required" : "needs_review",
      actor_type: "hermes",
      from_status: "received",
      to_status: needsResolution ? "needs_resolution" : "needs_review",
      metadata: {
        received_at: now,
        resolution_reason: resolution.reason,
        candidate_count: candidates.length,
      },
    })
  )
  await sendAiProductDraftAdminNotification(req.scope as never, {
    kind: needsResolution ? "needs_resolution" : "needs_review",
    draft_id: String(draft.id),
    product_id: resolvedState?.productId,
    product_handle: resolvedState?.productHandle,
    warnings_count: normalizedDraft.warnings.length,
  })

  return res.status(201).json({ draft })
}

export function filterDrafts(
  drafts: Record<string, unknown>[],
  filters: { status?: string; q?: string; source_agent?: string }
) {
  const q = filters.q?.trim().toLowerCase()

  return drafts.filter((draft) => {
    if (filters.status && draft.status !== filters.status) return false
    if (filters.source_agent && draft.source_agent !== filters.source_agent) {
      return false
    }
    if (!q) return true

    return [
      draft.id,
      draft.product_id,
      draft.product_handle,
      draft.source_agent,
      getRecord(draft.product_input).product_name,
      getRecord(getRecord(draft.normalized_draft).target_product).product_title,
    ].some((value) => String(value || "").toLowerCase().includes(q))
  })
}

const AI_PRODUCT_DRAFT_ORDER_FIELDS = [
  "product_name",
  "created_at",
  "updated_at",
  "confidence",
  "warnings",
  "status",
  "resolved_operation",
] as const

type AiProductDraftOrderField = (typeof AI_PRODUCT_DRAFT_ORDER_FIELDS)[number]

export type AiProductDraftOrder = {
  field: AiProductDraftOrderField
  descending: boolean
}

export function parseAiProductDraftOrder(value: unknown): AiProductDraftOrder {
  const raw = typeof value === "string" ? value.trim() : ""
  const descending = raw.startsWith("-")
  const field = (descending ? raw.slice(1) : raw || "created_at") as
    | AiProductDraftOrderField
    | string

  if (!AI_PRODUCT_DRAFT_ORDER_FIELDS.includes(field as AiProductDraftOrderField)) {
    throw new Error(`Unsupported AI product draft order: ${field}`)
  }

  return { field: field as AiProductDraftOrderField, descending }
}

function getDraftSortValue(
  draft: Record<string, unknown>,
  field: AiProductDraftOrderField
): string | number {
  if (field === "product_name") {
    return String(
      getRecord(draft.product_input).product_name ||
        getRecord(getRecord(draft.normalized_draft).target_product).product_title ||
        draft.product_handle ||
        draft.id ||
        ""
    ).toLowerCase()
  }
  if (field === "confidence") {
    const value = Number(getRecord(draft.confidence_summary).overall)
    return Number.isFinite(value) ? value : -1
  }
  if (field === "warnings") {
    return Array.isArray(draft.warnings) ? draft.warnings.length : 0
  }
  if (field === "created_at" || field === "updated_at") {
    const timestamp = new Date(String(draft[field] || 0)).getTime()
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  return String(draft[field] || "").toLowerCase()
}

export function sortAiProductDrafts(
  drafts: Record<string, unknown>[],
  order: AiProductDraftOrder
) {
  return [...drafts].sort((left, right) => {
    const leftValue = getDraftSortValue(left, order.field)
    const rightValue = getDraftSortValue(right, order.field)
    const comparison =
      typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue))
    const directed = order.descending ? -comparison : comparison

    return directed || String(left.id || "").localeCompare(String(right.id || ""))
  })
}

export function getAiProductDraftStatusCounts(
  drafts: Record<string, unknown>[]
): Record<string, number> {
  return drafts.reduce<Record<string, number>>((counts, draft) => {
    const status = typeof draft.status === "string" ? draft.status : ""
    if (status) counts[status] = (counts[status] || 0) + 1
    return counts
  }, {})
}

export function getAdminActorId(req: MedusaRequest) {
  return getString(
    (req as MedusaRequest & { auth_context?: { actor_id?: string } })
      .auth_context?.actor_id
  )
}
