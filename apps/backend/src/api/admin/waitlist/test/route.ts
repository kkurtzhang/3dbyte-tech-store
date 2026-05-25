import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { isValidEmail, normalizeEmail } from "../../../../lib/waitlist/tokens"
import { sendWaitlistBackInStockNotification } from "../../../../lib/waitlist/notifications"
import { getWaitlistEntryById } from "../utils"

type TestWaitlistNotificationBody = {
  email: string
  waitlist_id: string
}

export async function POST(
  req: MedusaRequest<TestWaitlistNotificationBody>,
  res: MedusaResponse,
) {
  const email = normalizeEmail(req.body.email || "")

  if (!req.body.waitlist_id || !isValidEmail(email)) {
    return res.status(400).json({
      message: "waitlist_id and a valid email are required",
    })
  }

  const entry = await getWaitlistEntryById(req, req.body.waitlist_id)
  if (!entry) {
    return res.status(404).json({
      message: "Waitlist item not found",
    })
  }

  await sendWaitlistBackInStockNotification({
    container: req.scope,
    entry,
    notificationCount: entry.notification_count || 0,
    testEmail: email,
  })

  return res.status(200).json({
    message: "Test notification sent",
  })
}
