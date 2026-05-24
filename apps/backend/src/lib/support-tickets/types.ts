export const SUPPORT_TICKET_STATUSES = [
  "new",
  "open",
  "waiting_customer",
  "waiting_internal",
  "resolved",
  "closed",
  "spam",
] as const

export const SUPPORT_TICKET_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const

export const SUPPORT_TICKET_CATEGORIES = [
  "general",
  "product_support",
  "order_status",
  "shipping",
  "returns_refunds",
  "account",
  "wholesale",
  "other",
] as const

export const SUPPORT_TICKET_SOURCES = [
  "contact_form",
  "ai_chat",
  "order_page",
  "account",
  "admin",
] as const

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number]
export type SupportTicketPriority = (typeof SUPPORT_TICKET_PRIORITIES)[number]
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number]
export type SupportTicketSource = (typeof SUPPORT_TICKET_SOURCES)[number]

export type SupportTicketRecord = {
  id: string
  ticket_number: string
  status: SupportTicketStatus | string
  priority: SupportTicketPriority | string
  category: SupportTicketCategory | string
  source: SupportTicketSource | string
  subject: string
  customer_name: string
  customer_email: string
  customer_id?: string | null
  order_id?: string | null
  order_reference?: string | null
  product_id?: string | null
  product_handle?: string | null
  assigned_admin_id?: string | null
  ai_summary?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | Date | null
  updated_at?: string | Date | null
  last_message_at?: string | Date | null
  resolved_at?: string | Date | null
  closed_at?: string | Date | null
}

export type SupportTicketMessageRecord = {
  id: string
  ticket_id: string
  author_type: "customer" | "admin" | "ai" | "system" | string
  direction: "inbound" | "outbound" | "internal" | string
  visibility: "customer" | "internal" | string
  body: string
  author_name?: string | null
  author_email?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | Date | null
}

export type SupportTicketEventRecord = {
  id: string
  ticket_id: string
  type: string
  from_value?: string | null
  to_value?: string | null
  actor_type?: string | null
  actor_id?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | Date | null
}
