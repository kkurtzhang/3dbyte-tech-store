import { createHash } from "node:crypto"

import { ProductResearchPacketSchema } from "./schemas"
import type { ProductResearchPacket } from "./schemas"

export type AiProductDraftMigrationRecord = {
  id: string
  status: string
  packet_version?: number | null
  raw_packet?: unknown
  normalized_draft?: unknown
  resolved_operation?: string | null
  validation_errors?: unknown
  created_at?: string | Date | null
}

type RepairPacketPreparation = {
  kind: "repair_packet"
  draft_id: string
  packet: ProductResearchPacket
  signature: string
}

type RepairNormalizedPreparation = {
  kind: "repair_normalized"
  draft_id: string
  normalized_draft: Record<string, unknown>
  signature: string
}

type UnrecoverablePreparation = {
  kind: "unrecoverable"
  draft_id: string
  reason: "packet_schema_invalid"
  validation_errors: { path: string; message: string }[]
}

type NoopPreparation = {
  kind: "noop"
  draft_id: string
  reason: "already_resolved" | "terminal_status" | "missing_source_data"
}

export type AiProductDraftMigrationPreparation =
  | RepairPacketPreparation
  | RepairNormalizedPreparation
  | UnrecoverablePreparation
  | NoopPreparation

export type AiProductDraftMigrationPlan = {
  repairs: AiProductDraftMigrationPreparation[]
  duplicates: {
    draft_id: string
    canonical_draft_id: string
    signature: string
  }[]
  unrecoverable: UnrecoverablePreparation[]
  noop: NoopPreparation[]
  manifest_hash: string
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  const record = asRecord(value)
  if (!record) return value

  return Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalize(nested)])
  )
}

const hashValue = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")

const formatSchemaErrors = (issues: { path: PropertyKey[]; message: string }[]) =>
  issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }))

function sanitizePacketForMigration(rawPacket: Record<string, unknown>) {
  const packetVersion = Number(rawPacket.packet_version)
  const requestedOperation = rawPacket.requested_operation
  const shouldClearLegacyTarget =
    packetVersion === 2 &&
    (requestedOperation === "create" || requestedOperation === "auto")

  return {
    ...rawPacket,
    ...(shouldClearLegacyTarget
      ? {
          product_id: "",
          product_handle: "",
        }
      : {}),
  }
}

function buildPacketSignature(packet: ProductResearchPacket) {
  const signaturePacket = {
    ...packet,
    ...(packet.packet_version === 2 ? { request_id: undefined } : {}),
    product_id: "",
    product_handle: "",
  }

  return hashValue(signaturePacket)
}

export function prepareAiProductDraftMigration(
  draft: AiProductDraftMigrationRecord
): AiProductDraftMigrationPreparation {
  if (["imported", "rejected"].includes(draft.status)) {
    return { kind: "noop", draft_id: draft.id, reason: "terminal_status" }
  }

  if (
    draft.resolved_operation === "create" ||
    draft.resolved_operation === "enrich"
  ) {
    return { kind: "noop", draft_id: draft.id, reason: "already_resolved" }
  }

  const normalizedDraft = asRecord(draft.normalized_draft)
  if (normalizedDraft) {
    return {
      kind: "repair_normalized",
      draft_id: draft.id,
      normalized_draft: normalizedDraft,
      signature: hashValue(normalizedDraft),
    }
  }

  const rawPacket = asRecord(draft.raw_packet)
  if (!rawPacket) {
    return { kind: "noop", draft_id: draft.id, reason: "missing_source_data" }
  }

  const parsed = ProductResearchPacketSchema.safeParse(
    sanitizePacketForMigration(rawPacket)
  )
  if (!parsed.success) {
    return {
      kind: "unrecoverable",
      draft_id: draft.id,
      reason: "packet_schema_invalid",
      validation_errors: formatSchemaErrors(parsed.error.issues),
    }
  }

  return {
    kind: "repair_packet",
    draft_id: draft.id,
    packet: parsed.data,
    signature: buildPacketSignature(parsed.data),
  }
}

export function buildAiProductDraftMigrationPlan(
  drafts: AiProductDraftMigrationRecord[]
): AiProductDraftMigrationPlan {
  const ordered = [...drafts].sort((left, right) => {
    const createdDifference =
      new Date(left.created_at || 0).getTime() -
      new Date(right.created_at || 0).getTime()

    return createdDifference || left.id.localeCompare(right.id)
  })
  const prepared = ordered.map((draft) => ({
    draft,
    preparation: prepareAiProductDraftMigration(draft),
  }))
  const repairs: AiProductDraftMigrationPreparation[] = []
  const duplicates: AiProductDraftMigrationPlan["duplicates"] = []
  const unrecoverable: UnrecoverablePreparation[] = []
  const noop: NoopPreparation[] = []
  const canonicalBySignature = new Map<string, string>()

  for (const { preparation } of prepared) {
    if (preparation.kind === "unrecoverable") {
      unrecoverable.push(preparation)
      continue
    }
    if (preparation.kind === "noop") {
      noop.push(preparation)
      continue
    }

    const canonicalDraftId = canonicalBySignature.get(preparation.signature)
    if (canonicalDraftId) {
      duplicates.push({
        draft_id: preparation.draft_id,
        canonical_draft_id: canonicalDraftId,
        signature: preparation.signature,
      })
      continue
    }

    canonicalBySignature.set(preparation.signature, preparation.draft_id)
    repairs.push(preparation)
  }

  const manifest = {
    repairs: repairs.map((entry) => entry.draft_id),
    duplicates,
    unrecoverable: unrecoverable.map((entry) => ({
      draft_id: entry.draft_id,
      reason: entry.reason,
    })),
  }

  return {
    repairs,
    duplicates,
    unrecoverable,
    noop,
    manifest_hash: hashValue(manifest),
  }
}
