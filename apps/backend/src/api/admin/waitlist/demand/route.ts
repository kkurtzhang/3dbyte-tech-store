import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { buildWaitlistDemand } from "../../../../lib/waitlist/admin"
import { getFilteredEntries, listAdminWaitlistEntries } from "../utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const entries = getFilteredEntries(req, await listAdminWaitlistEntries(req))

  return res.json({
    demand: buildWaitlistDemand(entries),
  })
}
