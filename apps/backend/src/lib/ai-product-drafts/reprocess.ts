import { z } from "@medusajs/framework/zod"
import { ProductResearchPacketV3Schema } from "./schemas"
import { draftReviewHash } from "./quality"
import { normalizeV3 } from "./normalizer-v3"
import { isHermesProductDraftPayloadTooLarge } from "./security"

const ReplacementSchema = z.object({ packet: ProductResearchPacketV3Schema, review_hash: z.string().length(64) }).strict()
const identity = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : ""

export function prepareReplacement(draft: Record<string, unknown>, body: unknown) {
  if (isHermesProductDraftPayloadTooLarge(body)) throw new Error("Product research packet is too large")
  if (!["needs_review", "validation_failed", "needs_resolution", "rejected"].includes(String(draft.status)) ||
      (draft.import_progress && Object.keys(draft.import_progress).length) || draft.imported_at || draft.import_summary) {
    throw new Error("Only unimported, unapproved drafts can have research replaced. Imported work requires a separate audit.")
  }
  const { packet, review_hash } = ReplacementSchema.parse(body)
  if (review_hash !== draftReviewHash(draft)) throw new Error("The draft changed. Refresh before replacing research.")
  const input = draft.product_input as Record<string, unknown> | null
  if (!identity(input?.product_name) || identity(input?.product_name) !== identity(packet.product_input.product_name)) {
    throw new Error("Replacement research must identify the same product and variant.")
  }
  for (const field of ["manufacturer_part_number", "gtin", "colour", "diameter_mm", "spool_weight_g"]) {
    if (input?.[field] && String(input[field]).toLowerCase() !== String(packet.product_input[field] ?? "").toLowerCase()) {
      throw new Error(`Replacement research changes the product identity: ${field}.`)
    }
  }
  if (draft.request_id && draft.request_id !== packet.request_id) throw new Error("Keep the existing request_id when replacing research.")
  return { packet, ...normalizeV3(packet) }
}
