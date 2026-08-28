import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

import { getAiProductDraftModule } from "../utils"

const EXPORT_LIMIT = 500
const ExportQuerySchema = z
  .object({
    status: z.literal("validation_failed"),
    expected_count: z.coerce.number().int().min(1).max(EXPORT_LIMIT),
  })
  .strict()

const exportFields = [
  "id",
  "status",
  "packet_version",
  "source_agent",
  "request_id",
  "product_id",
  "product_handle",
  "product_input",
  "source_summary",
  "raw_packet",
  "sources",
  "warnings",
  "validation_errors",
  "created_at",
  "updated_at",
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = ExportQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return res.status(400).json({
      error:
        "Export requires validation_failed status and an expected count between 1 and 500",
    })
  }

  const draftModule = getAiProductDraftModule(req)
  const drafts = await draftModule.listAiProductDrafts(
    { status: parsed.data.status },
    {
      select: exportFields,
      take: EXPORT_LIMIT + 1,
    }
  )
  const failedDrafts = drafts.filter(
    (draft) => draft.status === "validation_failed"
  )

  if (failedDrafts.length !== parsed.data.expected_count) {
    return res.status(409).json({
      error:
        "The validation-failed draft queue changed. Refresh the table and export again.",
    })
  }

  return res.status(200).json({
    export_version: 1,
    exported_at: new Date().toISOString(),
    status: parsed.data.status,
    count: failedDrafts.length,
    drafts: failedDrafts,
  })
}
