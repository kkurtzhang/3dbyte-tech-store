import { deliveryFromEvents, publicDelivery, DELIVERY_EVENT } from "../../../lib/support-tickets/delivery-state"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getSupportTicketModule } from "../../support-ticket-utils"
import {
  filterSupportTickets,
  paginateSupportTickets,
} from "../../../lib/support-tickets/admin"

const parseLimit = (value: unknown, defaultValue = 20): number => {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  if (Number.isNaN(parsed) || parsed <= 0) return defaultValue

  return Math.min(parsed, 100)
}

const parseOffset = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const supportTicketModule = getSupportTicketModule(req)
  const tickets = await supportTicketModule.listSupportTickets({})
  const filtered = filterSupportTickets(tickets, {
    category:
      typeof req.query.category === "string" ? req.query.category : undefined,
    q: typeof req.query.q === "string" ? req.query.q : undefined,
    source: typeof req.query.source === "string" ? req.query.source : undefined,
    status: typeof req.query.status === "string" ? req.query.status : undefined,
  })
  const limit = parseLimit(req.query.limit)
  const offset = parseOffset(req.query.offset)

  const page = paginateSupportTickets(filtered, limit, offset)
  const ids = page
    .filter((ticket) => ticket.source === "ai_chat")
    .map((ticket) => ticket.id)
  const events = ids.length
    ? await supportTicketModule.listSupportTicketEvents({
        ticket_id: ids,
        type: DELIVERY_EVENT,
      })
    : []
  return res.json({
    tickets: page.map((ticket) => {
      if (ticket.source !== "ai_chat") return ticket
      const ticketEvents = events.filter((event) => event.ticket_id === ticket.id)
      return {
        ...ticket,
        deliveries: (["customer", "internal"] as const).map((kind) =>
          publicDelivery(deliveryFromEvents(ticket, ticketEvents, kind))
        ),
      }
    }),
    count: filtered.length,
    limit,
    offset,
  })
}
