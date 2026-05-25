import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getRequestHeader, getSupportTicketModule } from "../../support-ticket-utils"
import {
  SUPPORT_TICKET_AI_HANDOFF_HEADER,
  SUPPORT_TICKET_AI_TRANSCRIPT_MAX_LENGTH,
} from "../../../lib/support-tickets/ai-handoff"
import { sendSupportTicketCreatedNotifications } from "../../../lib/support-tickets/notifications"
import { generateSupportTicketNumber } from "../../../lib/support-tickets/ticket-number"
import { parseCreateSupportTicketInput } from "../../../lib/support-tickets/validation"

function authorizeInternalAiRequest(
  req: MedusaRequest,
  res: MedusaResponse
): boolean {
  const configuredToken = process.env.INTERNAL_API_TOKEN?.trim()

  if (!configuredToken) {
    res.status(503).json({ error: "Internal AI token is not configured" })
    return false
  }

  if (getRequestHeader(req, SUPPORT_TICKET_AI_HANDOFF_HEADER) !== configuredToken) {
    res.status(401).json({ error: "Unauthorized" })
    return false
  }

  return true
}

function buildAiMetadata(body: Record<string, unknown>) {
  const consentToIncludeTranscript = body.consent_to_include_transcript === true
  const transcriptExcerpt =
    consentToIncludeTranscript && typeof body.transcript_excerpt === "string"
      ? body.transcript_excerpt.trim().slice(0, SUPPORT_TICKET_AI_TRANSCRIPT_MAX_LENGTH)
      : null

  return {
    consent_to_include_transcript: consentToIncludeTranscript,
    transcript_excerpt: transcriptExcerpt,
    verified_order_context:
      typeof body.verified_order_context === "object" &&
      body.verified_order_context !== null
        ? body.verified_order_context
        : null,
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!authorizeInternalAiRequest(req, res)) return

  const body = req.body as Record<string, unknown>
  const parsed = parseCreateSupportTicketInput(
    {
      ...body,
      source: "ai_chat",
      metadata: {
        ...(typeof body.metadata === "object" && body.metadata !== null
          ? (body.metadata as Record<string, unknown>)
          : {}),
        ...buildAiMetadata(body),
      },
    },
    "ai_chat"
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
    source: "ai_chat",
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
    author_type: "ai",
    direction: "inbound",
    visibility: "customer",
    body: parsed.data.message,
    author_name: parsed.data.name,
    author_email: parsed.data.email,
    metadata: parsed.data.metadata,
  })
  await supportTicketModule.createSupportTicketEvents({
    ticket_id: ticket.id,
    type: "ai_handoff_created",
    actor_type: "ai",
    metadata: parsed.data.metadata,
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
