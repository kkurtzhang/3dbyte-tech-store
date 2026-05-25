import type {
  SupportTicketCategory,
  SupportTicketPriority,
} from "./types"

export const SUPPORT_TICKET_AI_HANDOFF_ENDPOINT = "/ai/support-ticket"
export const SUPPORT_TICKET_AI_HANDOFF_HEADER = "x-3db-internal-token"
export const SUPPORT_TICKET_AI_TRANSCRIPT_MAX_LENGTH = 4_000

export type SupportTicketAiHandoffPayload = {
  name: string
  email: string
  subject: string
  message: string
  category?: SupportTicketCategory
  priority?: SupportTicketPriority
  customer_id?: string | null
  order_id?: string | null
  order_reference?: string | null
  product_id?: string | null
  product_handle?: string | null
  ai_summary?: string | null
  transcript_excerpt?: string | null
  consent_to_include_transcript?: boolean
  verified_order_context?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

export type SupportTicketAiHandoffResponse = {
  ticket: {
    id: string
    ticket_number: string
    status: string
    created_at?: string | Date | null
  }
}
