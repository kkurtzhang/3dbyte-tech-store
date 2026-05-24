import type { MedusaRequest } from "@medusajs/framework/http"

import { SUPPORT_TICKET_MODULE } from "../modules/support-ticket"
import type {
  SupportTicketEventRecord,
  SupportTicketMessageRecord,
  SupportTicketRecord,
} from "../lib/support-tickets/types"

export type SupportTicketModule = {
  createSupportTickets: (
    payload: Record<string, unknown>
  ) => Promise<SupportTicketRecord>
  updateSupportTickets: (
    payload: Record<string, unknown>
  ) => Promise<SupportTicketRecord>
  listSupportTickets: (
    filters: Record<string, unknown>
  ) => Promise<SupportTicketRecord[]>
  createSupportTicketMessages: (
    payload: Record<string, unknown>
  ) => Promise<SupportTicketMessageRecord>
  listSupportTicketMessages: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<SupportTicketMessageRecord[]>
  createSupportTicketEvents: (
    payload: Record<string, unknown>
  ) => Promise<SupportTicketEventRecord>
  listSupportTicketEvents: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<SupportTicketEventRecord[]>
}

export const getSupportTicketModule = (req: MedusaRequest): SupportTicketModule =>
  req.scope.resolve<SupportTicketModule>(SUPPORT_TICKET_MODULE)

export const getRequestHeader = (req: MedusaRequest, name: string): string => {
  const request = req as MedusaRequest & {
    get?: (headerName: string) => string | undefined
    headers?: Headers | Record<string, string | string[] | undefined>
  }
  const direct = request.get?.(name)

  if (direct) return direct

  if (request.headers instanceof Headers) {
    return request.headers.get(name) ?? ""
  }

  const lowerName = name.toLowerCase()
  const value = request.headers?.[lowerName] ?? request.headers?.[name]

  if (Array.isArray(value)) return value[0] ?? ""

  return value ?? ""
}

export const getClientIp = (req: MedusaRequest): string =>
  getRequestHeader(req, "x-forwarded-for").split(",")[0]?.trim() ||
  getRequestHeader(req, "x-real-ip") ||
  "unknown"
