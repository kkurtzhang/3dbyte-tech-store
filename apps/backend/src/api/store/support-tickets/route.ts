import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getClientIp, getSupportTicketModule } from "../../support-ticket-utils"
import { sendSupportTicketCreatedNotifications } from "../../../lib/support-tickets/notifications"
import { checkSupportTicketRateLimit } from "../../../lib/support-tickets/rate-limit"
import { generateSupportTicketNumber } from "../../../lib/support-tickets/ticket-number"
import { parseCreateSupportTicketInput } from "../../../lib/support-tickets/validation"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const rate = checkSupportTicketRateLimit(
    `store-support-ticket:${getClientIp(req)}`
  )

  if (!rate.allowed) {
    res.setHeader?.("Retry-After", Math.ceil(rate.retryAfterMs / 1000).toString())
    return res.status(429).json({
      message: "Too many support requests. Please try again shortly.",
    })
  }

  const parsed = parseCreateSupportTicketInput(
    req.body as Record<string, unknown>,
    "contact_form"
  )

  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.message,
    })
  }

  const supportTicketModule = getSupportTicketModule(req)
  const ticket = await supportTicketModule.createSupportTickets({
    ticket_number: generateSupportTicketNumber(),
    status: "new",
    priority: parsed.data.priority,
    category: parsed.data.category,
    source: parsed.data.source,
    subject: parsed.data.subject,
    customer_name: parsed.data.name,
    customer_email: parsed.data.email,
    customer_id: parsed.data.customer_id,
    order_id: parsed.data.order_id,
    order_reference: parsed.data.order_reference,
    product_id: parsed.data.product_id,
    product_handle: parsed.data.product_handle,
    ai_summary: parsed.data.ai_summary,
    metadata: parsed.data.metadata,
    last_message_at: new Date().toISOString(),
  })

  await supportTicketModule.createSupportTicketMessages({
    ticket_id: ticket.id,
    author_type: "customer",
    direction: "inbound",
    visibility: "customer",
    body: parsed.data.message,
    author_name: parsed.data.name,
    author_email: parsed.data.email,
    metadata: null,
  })
  await supportTicketModule.createSupportTicketEvents({
    ticket_id: ticket.id,
    type: "created",
    actor_type: "customer",
    actor_id: parsed.data.customer_id,
    metadata: {
      source: parsed.data.source,
    },
  })
  await sendSupportTicketCreatedNotifications({
    container: req.scope,
    ticket,
  })

  return res.status(201).json({
    ticket: {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      status: ticket.status,
      created_at: ticket.created_at,
    },
  })
}
