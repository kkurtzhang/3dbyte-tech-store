import type { SupportTicketRecord } from "./types"

export type SupportTicketAdminFilters = {
  category?: string
  q?: string
  source?: string
  status?: string
}

const getSearchText = (ticket: SupportTicketRecord): string =>
  [
    ticket.ticket_number,
    ticket.subject,
    ticket.customer_email,
    ticket.customer_name,
    ticket.order_reference,
    ticket.product_handle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

export const filterSupportTickets = (
  tickets: SupportTicketRecord[],
  filters: SupportTicketAdminFilters
): SupportTicketRecord[] => {
  const query = filters.q?.trim().toLowerCase()

  return tickets.filter((ticket) => {
    if (filters.status && ticket.status !== filters.status) return false
    if (filters.category && ticket.category !== filters.category) return false
    if (filters.source && ticket.source !== filters.source) return false
    if (query && !getSearchText(ticket).includes(query)) return false

    return true
  })
}

export const paginateSupportTickets = (
  tickets: SupportTicketRecord[],
  limit: number,
  offset: number
): SupportTicketRecord[] => tickets.slice(offset, offset + limit)
