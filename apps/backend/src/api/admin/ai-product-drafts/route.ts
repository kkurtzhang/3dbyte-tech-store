import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

import {
  filterDrafts,
  getAiProductDraftStatusCounts,
  getAiProductDraftModule,
  parseAiProductDraftOrder,
  parseLimit,
  parseOffset,
  sortAiProductDrafts,
} from "./utils"

const BULK_CLEANUP_LIMIT = 500
const BulkCleanupSchema = z
  .object({
    status: z.literal("validation_failed"),
    expected_count: z.number().int().min(1).max(BULK_CLEANUP_LIMIT),
  })
  .strict()

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  let order
  try {
    order = parseAiProductDraftOrder(req.query.order)
  } catch (error) {
    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unsupported AI product draft order",
    })
  }

  const draftModule = getAiProductDraftModule(req)
  const drafts = await draftModule.listAiProductDrafts({})
  const queue = filterDrafts(drafts, {
    q: typeof req.query.q === "string" ? req.query.q : undefined,
    source_agent:
      typeof req.query.source_agent === "string"
        ? req.query.source_agent
        : undefined,
  })
  const statusCounts = getAiProductDraftStatusCounts(queue)
  const filtered = filterDrafts(queue, {
    status: typeof req.query.status === "string" ? req.query.status : undefined,
  })
  const sorted = sortAiProductDrafts(filtered, order)
  const limit = parseLimit(req.query.limit)
  const offset = parseOffset(req.query.offset)

  return res.json({
    drafts: sorted.slice(offset, offset + limit),
    count: filtered.length,
    limit,
    offset,
    status_counts: statusCounts,
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const parsed = BulkCleanupSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      error:
        "Bulk cleanup requires validation_failed status and an expected count between 1 and 500",
    })
  }

  const draftModule = getAiProductDraftModule(req)
  const drafts = await draftModule.listAiProductDrafts(
    { status: parsed.data.status },
    {
      select: ["id", "status"],
      take: BULK_CLEANUP_LIMIT + 1,
    }
  )
  const ids = drafts
    .filter((draft) => draft.status === "validation_failed")
    .map((draft) => (typeof draft.id === "string" ? draft.id : ""))
    .filter(Boolean)

  if (ids.length !== parsed.data.expected_count) {
    return res.status(409).json({
      error:
        "The validation-failed draft queue changed. Refresh the table and confirm cleanup again.",
    })
  }

  await draftModule.softDeleteAiProductDrafts(ids)

  return res.status(200).json({
    count: ids.length,
    deleted_ids: ids,
  })
}
