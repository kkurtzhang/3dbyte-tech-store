import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getSupportTicketModule } from "../../../support-ticket-utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const supportTicketModule = getSupportTicketModule(req)
  const [ticket] = await supportTicketModule.listSupportTickets({
    id: req.params.id,
  })

  if (!ticket) {
    return res.status(404).json({
      message: "Support ticket not found",
    })
  }

  const [messages, events] = await Promise.all([
    supportTicketModule.listSupportTicketMessages(
      { ticket_id: ticket.id },
      { order: { created_at: "ASC" } }
    ),
    supportTicketModule.listSupportTicketEvents(
      { ticket_id: ticket.id },
      { order: { created_at: "ASC" } }
    ),
  ])

  return res.json({
    ticket,
    messages,
    events,
  })
}
