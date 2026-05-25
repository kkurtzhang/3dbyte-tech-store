import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getSupportTicketModule } from "../../../../support-ticket-utils"
import { parseSupportTicketStatus } from "../../../../../lib/support-tickets/validation"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const status = parseSupportTicketStatus((req.body as Record<string, unknown>).status)

  if (!status) {
    return res.status(400).json({
      message: "A valid status is required",
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

  const updates: Record<string, unknown> = {
    id: ticket.id,
    status,
  }

  if (status === "resolved") updates.resolved_at = new Date().toISOString()
  if (status === "closed") updates.closed_at = new Date().toISOString()

  const updated = await supportTicketModule.updateSupportTickets(updates)
  await supportTicketModule.createSupportTicketEvents({
    ticket_id: ticket.id,
    type: "status_changed",
    from_value: String(ticket.status),
    to_value: status,
    actor_type: "admin",
    metadata: null,
  })

  return res.status(200).json({
    ticket: updated,
  })
}
