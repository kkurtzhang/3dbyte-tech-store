import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_SOURCES,
  SUPPORT_TICKET_STATUSES,
  type SupportTicketCategory,
  type SupportTicketPriority,
  type SupportTicketSource,
  type SupportTicketStatus,
} from "./types"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; message: string }

export type CreateSupportTicketInput = {
  name: string
  email: string
  subject: string
  message: string
  category: SupportTicketCategory
  source: SupportTicketSource
  priority: SupportTicketPriority
  order_id: string | null
  order_reference: string | null
  product_id: string | null
  product_handle: string | null
  customer_id: string | null
  ai_summary: string | null
  metadata: Record<string, unknown> | null
}

export type AdminMessageInput = {
  body: string
  visibility: "customer" | "internal"
}

const trimString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : ""

const trimOptionalString = (value: unknown): string | null => {
  const trimmed = trimString(value)
  return trimmed || null
}

const normalizeEmail = (value: unknown): string => trimString(value).toLowerCase()

const isOneOf = <T extends readonly string[]>(
  value: string,
  allowed: T
): value is T[number] => allowed.includes(value)

const getCategory = (value: unknown): SupportTicketCategory => {
  const category = trimString(value)
  return isOneOf(category, SUPPORT_TICKET_CATEGORIES) ? category : "general"
}

const getSource = (
  value: unknown,
  fallback: SupportTicketSource
): SupportTicketSource => {
  const source = trimString(value)
  return isOneOf(source, SUPPORT_TICKET_SOURCES) ? source : fallback
}

const getPriority = (value: unknown): SupportTicketPriority => {
  const priority = trimString(value)
  return isOneOf(priority, SUPPORT_TICKET_PRIORITIES) ? priority : "normal"
}

const truncate = (value: string, max: number): string => value.slice(0, max)

export const parseSupportTicketStatus = (
  value: unknown
): SupportTicketStatus | null => {
  const status = trimString(value)
  return isOneOf(status, SUPPORT_TICKET_STATUSES) ? status : null
}

export function parseCreateSupportTicketInput(
  body: Record<string, unknown>,
  fallbackSource: SupportTicketSource
): ParseResult<CreateSupportTicketInput> {
  const name = truncate(trimString(body.name), 120)
  const email = normalizeEmail(body.email)
  const subject = truncate(trimString(body.subject), 160)
  const message = truncate(trimString(body.message), 4_000)

  if (!name) {
    return { success: false, message: "Name is required" }
  }

  if (!EMAIL_RE.test(email)) {
    return { success: false, message: "A valid email is required" }
  }

  if (!subject) {
    return { success: false, message: "Subject is required" }
  }

  if (!message) {
    return { success: false, message: "Message is required" }
  }

  return {
    success: true,
    data: {
      name,
      email,
      subject,
      message,
      category: getCategory(body.category),
      source: getSource(body.source, fallbackSource),
      priority: getPriority(body.priority),
      order_id: trimOptionalString(body.order_id),
      order_reference: trimOptionalString(body.order_reference),
      product_id: trimOptionalString(body.product_id),
      product_handle: trimOptionalString(body.product_handle),
      customer_id: trimOptionalString(body.customer_id),
      ai_summary: trimOptionalString(body.ai_summary),
      metadata:
        typeof body.metadata === "object" && body.metadata !== null
          ? (body.metadata as Record<string, unknown>)
          : null,
    },
  }
}

export function parseAdminMessageInput(
  body: Record<string, unknown>
): ParseResult<AdminMessageInput> {
  const messageBody = truncate(trimString(body.body), 4_000)
  const visibility = trimString(body.visibility)

  if (!messageBody) {
    return { success: false, message: "Message body is required" }
  }

  return {
    success: true,
    data: {
      body: messageBody,
      visibility: visibility === "internal" ? "internal" : "customer",
    },
  }
}
