import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { buildWaitlistCsv } from "../../../../lib/waitlist/admin"
import { getFilteredEntries, listAdminWaitlistEntries } from "../utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const entries = getFilteredEntries(req, await listAdminWaitlistEntries(req))

  res.setHeader("Content-Type", "text/csv")
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="waitlist-export.csv"',
  )

  return res.send(buildWaitlistCsv(entries))
}
