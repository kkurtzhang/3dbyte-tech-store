import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getSupportTicketModule } from "../../../../support-ticket-utils"
import { sendSupportTicketCustomerReplyNotification } from "../../../../../lib/support-tickets/notifications"
import { parseAdminMessageInput } from "../../../../../lib/support-tickets/validation"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = parseAdminMessageInput(req.body as Record<string, unknown>)

  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.message,
    })
  }

  const supportTicketModule = getSupportTicketModule(req)
  const [ticket] = await supportTicketModule.listSupportTickets({
    id: req.params.id,
  })

  if (!ticket) {
    return res.status(404).json({
      message: "Support ticket not found",
    })
  }

  const message = await supportTicketModule.createSupportTicketMessages({
    ticket_id: ticket.id,
    author_type: "admin",
    direction: parsed.data.visibility === "internal" ? "internal" : "outbound",
    visibility: parsed.data.visibility,
    body: parsed.data.body,
    author_name: "Support Team",
    author_email: "support@3dbytetech.com.au",
    metadata: null,
  })
  await supportTicketModule.createSupportTicketEvents({
    ticket_id: ticket.id,
    type: parsed.data.visibility === "internal" ? "internal_note_added" : "reply_sent",
    actor_type: "admin",
    metadata: {
      message_id: message.id,
    },
  })

  if (parsed.data.visibility === "customer") {
    await sendSupportTicketCustomerReplyNotification({
      container: req.scope,
      message,
      ticket,
    })
  }

  return res.status(201).json({
    message,
  })
}
