import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getFilteredEntries,
  getPaginatedEntries,
  listAdminWaitlistEntries,
} from "../utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const filtered = getFilteredEntries(req, await listAdminWaitlistEntries(req))
  const paginated = getPaginatedEntries(req, filtered)

  return res.json({
    entries: paginated.entries,
    count: filtered.length,
    limit: paginated.limit,
    offset: paginated.offset,
  })
}
