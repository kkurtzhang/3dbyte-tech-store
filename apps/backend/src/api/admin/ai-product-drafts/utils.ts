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
import { AI_PRODUCT_DRAFT_MODULE } from "../../../modules/ai-product-draft"
import { buildAiProductDraftEvent } from "../../../modules/ai-product-draft/lifecycle"

export type AiProductDraftModule = {
  createAiProductDrafts: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateAiProductDrafts: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
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

function getRecord(value: unknown): Record<string, unknown> {
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

async function resolveProductReference(
  req: MedusaRequest,
  packet: ProductResearchPacket
): Promise<string[]> {
  const errors: string[] = []
  const productId = packet.product_id?.trim()
  const productHandle = packet.product_handle?.trim()

  if (!productId && !productHandle) {
    return errors
  }

  const query = req.scope.resolve("query") as QueryGraph
  const filters = {
    ...(productId ? { id: productId } : {}),
    ...(productHandle ? { handle: productHandle } : {}),
  }
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title"],
    filters,
    pagination: { take: 1 },
  })

  if (!data.length) {
    errors.push("Provided product_id/product_handle does not match an existing product")
  }

  return errors
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

  const productErrors = await resolveProductReference(req, parsedPacket.data)

  if (productErrors.length) {
    const draft = await draftModule.createAiProductDrafts({
      status: "validation_failed",
      packet_version: parsedPacket.data.packet_version,
      source_agent: parsedPacket.data.source_agent,
      product_id: parsedPacket.data.product_id || null,
      product_handle: parsedPacket.data.product_handle || null,
      product_input: parsedPacket.data.product_input,
      source_summary: parsedPacket.data.source_summary,
      raw_packet: parsedPacket.data,
      sources: parsedPacket.data.sources,
      validation_errors: productErrors.map((message) => ({
        path: "product",
        message,
      })),
      warnings: productErrors,
      normalizer: "deterministic",
    })

    await draftModule.createAiProductDraftEvents(
      buildAiProductDraftEvent({
        draft_id: String(draft.id),
        type: "validation_failed",
        actor_type: "hermes",
        from_status: "received",
        to_status: "validation_failed",
        metadata: { validation_errors: productErrors },
      })
    )
    await sendAiProductDraftAdminNotification(req.scope as never, {
      kind: "validation_failed",
      draft_id: String(draft.id),
      product_id: parsedPacket.data.product_id,
      product_handle: parsedPacket.data.product_handle,
      validation_error_count: productErrors.length,
    })

    return res.status(201).json({ draft })
  }

  let normalization

  try {
    normalization = await normalizeProductResearchPacketForDraft(parsedPacket.data)
  } catch (error) {
    const validationErrors = formatNormalizerErrors(error)
    const normalizerProvider = resolveAiProductDraftNormalizerProvider()
    const draft = await draftModule.createAiProductDrafts({
      status: "validation_failed",
      packet_version: parsedPacket.data.packet_version,
      source_agent: parsedPacket.data.source_agent,
      product_id: parsedPacket.data.product_id || null,
      product_handle: parsedPacket.data.product_handle || null,
      product_input: parsedPacket.data.product_input,
      source_summary: parsedPacket.data.source_summary,
      raw_packet: parsedPacket.data,
      sources: parsedPacket.data.sources,
      validation_errors: validationErrors,
      warnings: ["AI product draft normalizer failed validation"],
      normalizer: normalizerProvider,
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
      product_id: parsedPacket.data.product_id,
      product_handle: parsedPacket.data.product_handle,
      validation_error_count: validationErrors.length,
    })

    return res.status(201).json({ draft })
  }

  const normalizedDraft = normalization.draft
  const draft = await draftModule.createAiProductDrafts({
    status: "needs_review",
    packet_version: parsedPacket.data.packet_version,
    source_agent: parsedPacket.data.source_agent,
    product_id: parsedPacket.data.product_id || null,
    product_handle: parsedPacket.data.product_handle || null,
    product_input: parsedPacket.data.product_input,
    source_summary: parsedPacket.data.source_summary,
    raw_packet: parsedPacket.data,
    normalized_draft: normalizedDraft,
    sources: parsedPacket.data.sources,
    warnings: normalizedDraft.warnings,
    confidence_summary: normalizedDraft.confidence_summary,
    normalizer: normalization.normalizer,
    normalizer_trace_id: normalization.trace_id || null,
  })

  await draftModule.createAiProductDraftEvents(
    buildAiProductDraftEvent({
      draft_id: String(draft.id),
      type: "needs_review",
      actor_type: "hermes",
      from_status: "received",
      to_status: "needs_review",
      metadata: { received_at: now },
    })
  )
  await sendAiProductDraftAdminNotification(req.scope as never, {
    kind: "needs_review",
    draft_id: String(draft.id),
    product_id: parsedPacket.data.product_id,
    product_handle: parsedPacket.data.product_handle,
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

export function getAdminActorId(req: MedusaRequest) {
  return getString(
    (req as MedusaRequest & { auth_context?: { actor_id?: string } })
      .auth_context?.actor_id
  )
}
