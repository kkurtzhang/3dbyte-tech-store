import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getMarkNotifiedPayload } from "../../../../../lib/waitlist/admin"
import { sendWaitlistBackInStockNotification } from "../../../../../lib/waitlist/notifications"
import { getWaitlistEntryById, getWaitlistModule } from "../../utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const entry = await getWaitlistEntryById(req, req.params.id)

  if (!entry) {
    return res.status(404).json({
      message: "Waitlist item not found",
    })
  }

  const nextNotificationCount = (entry.notification_count || 0) + 1
  await sendWaitlistBackInStockNotification({
    container: req.scope,
    entry,
    notificationCount: nextNotificationCount,
  })

  const waitlistModule = getWaitlistModule(req)
  const waitlist = await waitlistModule.updateWaitlistEntries(
    getMarkNotifiedPayload(entry),
  )

  return res.status(200).json({
    waitlist,
  })
}
