import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import {
  buildAiProductDraftMigrationPlan,
  type AiProductDraftMigrationPreparation,
  type AiProductDraftMigrationRecord,
} from "../lib/ai-product-drafts/migration"
import { normalizeProductResearchPacketForDraft } from "../lib/ai-product-drafts/normalizer"
import type { ProductResearchPacket } from "../lib/ai-product-drafts/schemas"
import { buildResolvedDraftState } from "../api/admin/ai-product-drafts/utils"
import { AI_PRODUCT_DRAFT_MODULE } from "../modules/ai-product-draft"
import { buildAiProductDraftEvent } from "../modules/ai-product-draft/lifecycle"

type MigrationMode = "plan" | "apply" | "cleanup"

type Logger = {
  info(message: string): void
  warn(message: string): void
}

type DraftModule = {
  listAiProductDrafts(
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ): Promise<Record<string, unknown>[]>
  updateAiProductDrafts(
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>>
  softDeleteAiProductDrafts(ids: string[]): Promise<unknown>
  createAiProductDraftEvents(
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>>
  listAiProductDraftEvents(
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ): Promise<Record<string, unknown>[]>
}

type QueryGraph = {
  graph(input: Record<string, unknown>): Promise<{
    data: Record<string, unknown>[]
  }>
}

type ProductModule = {
  listProducts(
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ): Promise<Record<string, unknown>[]>
}

const MIGRATION_VERSION = "ai-product-drafts-2026-08-v1"
const DEMO_DRAFT_ID = "aipd_01KY99FVG59RB5REDDXHRYW50B"

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const normalizeIdentity = (value: unknown) =>
  asString(value).toLowerCase().replace(/[^a-z0-9]+/g, "")

function getMode(): MigrationMode {
  const value = asString(process.env.AI_PRODUCT_DRAFT_MIGRATION_MODE) || "plan"
  if (["plan", "apply", "cleanup"].includes(value)) {
    return value as MigrationMode
  }

  throw new Error(
    `Unsupported AI_PRODUCT_DRAFT_MIGRATION_MODE "${value}"; use plan, apply, or cleanup`
  )
}

function getCandidateIdentityValues(candidate: Record<string, unknown>) {
  const metadata = asRecord(candidate.metadata)
  const contractIdentity = asRecord(metadata.product_contract_identity)

  return [
    candidate.title,
    candidate.handle,
    metadata.manufacturer_part_number,
    metadata.gtin,
    metadata.supplier_sku,
    contractIdentity.manufacturer_part_number,
    contractIdentity.gtin,
    contractIdentity.supplier_sku,
  ]
    .map(normalizeIdentity)
    .filter(Boolean)
}

function getSubmittedIdentities(packet: ProductResearchPacket | null) {
  const input = asRecord(packet?.product_input)

  return [
    input.product_name,
    input.manufacturer_part_number,
    input.gtin,
    input.supplier_sku,
  ]
    .map(normalizeIdentity)
    .filter(Boolean)
}

async function findCurrentCandidates(
  query: QueryGraph,
  packet: ProductResearchPacket | null,
  normalizedDraft: Record<string, unknown>
) {
  const submittedIdentities = new Set([
    ...getSubmittedIdentities(packet),
    normalizeIdentity(asRecord(normalizedDraft.target_product).product_title),
  ])
  const searchTerms = [...submittedIdentities].filter(Boolean).slice(0, 4)
  if (!searchTerms.length) return []

  const responses = await Promise.all(
    searchTerms.map((q) =>
      query.graph({
        entity: "product",
        fields: ["id", "handle", "title", "metadata"],
        filters: { q },
        pagination: { take: 10 },
      })
    )
  )
  const uniqueCandidates = responses
    .flatMap((response) => response.data)
    .filter(
      (candidate, index, candidates) =>
        candidates.findIndex((entry) => entry.id === candidate.id) === index
    )

  return uniqueCandidates.filter((candidate) =>
    getCandidateIdentityValues(candidate).some((identity) =>
      submittedIdentities.has(identity)
    )
  )
}

async function normalizePreparation(
  preparation: AiProductDraftMigrationPreparation
) {
  if (preparation.kind === "repair_normalized") {
    return {
      normalizedDraft: preparation.normalized_draft,
      normalizer: "existing",
      traceId: null,
      packet: null,
    }
  }
  if (preparation.kind !== "repair_packet") {
    throw new Error(`Draft ${preparation.draft_id} is not repairable`)
  }

  const normalization = await normalizeProductResearchPacketForDraft(
    preparation.packet
  )
  return {
    normalizedDraft: normalization.draft,
    normalizer: normalization.normalizer,
    traceId: normalization.trace_id || null,
    packet: preparation.packet,
  }
}

async function hasMigrationEvent(
  draftModule: DraftModule,
  draftId: string,
  type: string,
  runId: string
) {
  const events = await draftModule.listAiProductDraftEvents(
    { draft_id: draftId, type },
    { take: 50 }
  )

  return events.some(
    (event) => asString(asRecord(event.metadata).migration_run_id) === runId
  )
}

async function recordMigrationEvent(
  draftModule: DraftModule,
  input: {
    draftId: string
    type: string
    fromStatus: string
    toStatus: string
    runId: string
    metadata?: Record<string, unknown>
  }
) {
  if (
    await hasMigrationEvent(
      draftModule,
      input.draftId,
      input.type,
      input.runId
    )
  ) {
    return
  }

  await draftModule.createAiProductDraftEvents(
    buildAiProductDraftEvent({
      draft_id: input.draftId,
      type: input.type,
      actor_type: "system",
      from_status: input.fromStatus,
      to_status: input.toStatus,
      metadata: {
        migration_version: MIGRATION_VERSION,
        migration_run_id: input.runId,
        ...input.metadata,
      },
    })
  )
}

async function applyRepairs(input: {
  draftModule: DraftModule
  query: QueryGraph
  draftsById: Map<string, Record<string, unknown>>
  repairs: AiProductDraftMigrationPreparation[]
  duplicates: {
    draft_id: string
    canonical_draft_id: string
    signature: string
  }[]
  runId: string
}) {
  let repaired = 0

  for (const preparation of input.repairs) {
    if (
      preparation.kind !== "repair_normalized" &&
      preparation.kind !== "repair_packet"
    ) {
      continue
    }

    const current = input.draftsById.get(preparation.draft_id)
    if (!current) throw new Error(`Draft ${preparation.draft_id} disappeared`)

    const normalization = await normalizePreparation(preparation)
    const candidates = await findCurrentCandidates(
      input.query,
      normalization.packet,
      normalization.normalizedDraft
    )
    const needsResolution = candidates.length > 0
    const resolvedState = needsResolution
      ? null
      : buildResolvedDraftState({
          operation: "create",
          target: null,
          normalized_draft: normalization.normalizedDraft,
        })
    const toStatus = needsResolution ? "needs_resolution" : "needs_review"
    const packet = normalization.packet

    await input.draftModule.updateAiProductDrafts({
      id: preparation.draft_id,
      status: toStatus,
      requested_operation: packet?.requested_operation || "create",
      resolved_operation: needsResolution ? null : "create",
      resolution_status: needsResolution ? "needs_resolution" : "resolved",
      identity_candidates: candidates,
      product_id: null,
      product_handle: null,
      ...(packet
        ? {
            product_input: packet.product_input,
            source_summary: packet.source_summary,
            sources: packet.sources,
          }
        : {}),
      normalized_draft:
        resolvedState?.normalizedDraft || normalization.normalizedDraft,
      current_snapshot: null,
      snapshot_hash: null,
      proposed_changes: resolvedState?.proposedChanges || [],
      warnings: Array.isArray(normalization.normalizedDraft.warnings)
        ? normalization.normalizedDraft.warnings
        : [],
      confidence_summary: asRecord(
        normalization.normalizedDraft.confidence_summary
      ),
      validation_errors: [],
      normalizer: normalization.normalizer,
      normalizer_trace_id: normalization.traceId,
      admin_notes: null,
      approved_changes: null,
      approved_import_targets: null,
      approved_snapshot_hash: null,
      approved_by: null,
      approved_at: null,
      import_progress: null,
      import_summary: null,
      imported_by: null,
      imported_at: null,
    })

    await recordMigrationEvent(input.draftModule, {
      draftId: preparation.draft_id,
      type: "legacy_migrated",
      fromStatus: asString(current.status),
      toStatus,
      runId: input.runId,
      metadata: {
        operation: needsResolution ? null : "create",
        candidate_count: candidates.length,
        source_kind: preparation.kind,
      },
    })
    repaired += 1
  }

  for (const duplicate of input.duplicates) {
    const current = input.draftsById.get(duplicate.draft_id)
    if (!current) continue

    await recordMigrationEvent(input.draftModule, {
      draftId: duplicate.draft_id,
      type: "migration_duplicate",
      fromStatus: asString(current.status),
      toStatus: asString(current.status),
      runId: input.runId,
      metadata: {
        canonical_draft_id: duplicate.canonical_draft_id,
        signature: duplicate.signature,
      },
    })
  }

  return repaired
}

async function cleanupMigration(input: {
  draftModule: DraftModule
  productModule: ProductModule
  runId: string
}) {
  const confirmation = asString(
    process.env.AI_PRODUCT_DRAFT_MIGRATION_CLEANUP_CONFIRM
  )
  if (confirmation !== input.runId) {
    throw new Error(
      "Cleanup confirmation does not match the migration run ID"
    )
  }

  const duplicateEvents = await input.draftModule.listAiProductDraftEvents(
    { type: "migration_duplicate" },
    { take: 5000 }
  )
  const cleanupIds: string[] = []

  for (const event of duplicateEvents) {
    const metadata = asRecord(event.metadata)
    if (asString(metadata.migration_run_id) !== input.runId) continue

    const draftId = asString(event.draft_id)
    const canonicalDraftId = asString(metadata.canonical_draft_id)
    const [canonical] = await input.draftModule.listAiProductDrafts({
      id: canonicalDraftId,
    })
    if (
      draftId &&
      canonical &&
      ["needs_review", "needs_resolution", "approved", "imported"].includes(
        asString(canonical.status)
      )
    ) {
      cleanupIds.push(draftId)
    }
  }

  const [demoDraft] = await input.draftModule.listAiProductDrafts({
    id: DEMO_DRAFT_ID,
  })
  if (demoDraft) {
    const demoName = asString(asRecord(demoDraft.product_input).product_name)
    const linkedProducts = demoDraft.product_id
      ? await input.productModule.listProducts({ id: demoDraft.product_id })
      : []

    if (
      demoName === "Example PETG Filament" &&
      asString(demoDraft.status) === "needs_review" &&
      linkedProducts.length === 0
    ) {
      cleanupIds.push(DEMO_DRAFT_ID)
    }
  }

  const uniqueIds = [...new Set(cleanupIds)]
  if (uniqueIds.length) {
    for (const draftId of uniqueIds) {
      const [draft] = await input.draftModule.listAiProductDrafts({ id: draftId })
      if (!draft) continue
      await recordMigrationEvent(input.draftModule, {
        draftId,
        type: "migration_cleanup",
        fromStatus: asString(draft.status),
        toStatus: asString(draft.status),
        runId: input.runId,
        metadata: { soft_deleted: true },
      })
    }
    await input.draftModule.softDeleteAiProductDrafts(uniqueIds)
  }

  return uniqueIds
}

export default async function migrateAiProductDrafts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph
  const productModule = container.resolve(Modules.PRODUCT) as ProductModule
  const draftModule = container.resolve(AI_PRODUCT_DRAFT_MODULE) as DraftModule
  const mode = getMode()

  if (mode === "cleanup") {
    const runId = asString(process.env.AI_PRODUCT_DRAFT_MIGRATION_RUN_ID)
    if (!runId) throw new Error("AI_PRODUCT_DRAFT_MIGRATION_RUN_ID is required")
    const cleanedIds = await cleanupMigration({
      draftModule,
      productModule,
      runId,
    })
    logger.info(
      JSON.stringify({ mode, migration_version: MIGRATION_VERSION, run_id: runId, cleaned_ids: cleanedIds })
    )
    return { mode, run_id: runId, cleaned_ids: cleanedIds }
  }

  const drafts = await draftModule.listAiProductDrafts(
    {},
    { take: 5000, order: { created_at: "ASC" } }
  )
  const plan = buildAiProductDraftMigrationPlan(
    drafts as AiProductDraftMigrationRecord[]
  )
  const runId = `${MIGRATION_VERSION}-${plan.manifest_hash.slice(0, 12)}`
  const report = {
    mode,
    migration_version: MIGRATION_VERSION,
    run_id: runId,
    manifest_hash: plan.manifest_hash,
    repairs: plan.repairs.map((entry) => entry.draft_id),
    duplicates: plan.duplicates,
    unrecoverable: plan.unrecoverable,
    unchanged: plan.noop.length,
  }

  logger.info(JSON.stringify(report))
  if (mode === "plan") return report

  if (
    asString(process.env.AI_PRODUCT_DRAFT_MIGRATION_CONFIRM) !==
    plan.manifest_hash
  ) {
    throw new Error(
      "AI_PRODUCT_DRAFT_MIGRATION_CONFIRM must match the current plan manifest hash"
    )
  }

  const repaired = await applyRepairs({
    draftModule,
    query,
    draftsById: new Map(drafts.map((draft) => [asString(draft.id), draft])),
    repairs: plan.repairs,
    duplicates: plan.duplicates,
    runId,
  })
  logger.info(
    JSON.stringify({
      mode,
      migration_version: MIGRATION_VERSION,
      run_id: runId,
      repaired,
      duplicate_candidates: plan.duplicates.length,
    })
  )

  return { ...report, repaired }
}
