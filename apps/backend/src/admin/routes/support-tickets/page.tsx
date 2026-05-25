import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight, Eye } from "@medusajs/icons"
import {
  Badge,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  Input,
  useDataTable,
} from "@medusajs/ui"
import { useMemo, useState } from "react"

import { ActionMenu } from "../../components/action-menu"
import { Container } from "../../components/container"
import { Header } from "../../components/header"
import { useSupportTickets } from "../../hooks/support-tickets"
import {
  formatSupportTicketDate,
  getSupportTicketStatusBadgeColor,
  labelizeSupportTicketValue,
} from "../../lib/support-tickets"
import type {
  AdminSupportTicket,
  SupportTicketQueryParams,
} from "../../types"

const limit = 15

const statuses = [
  "all",
  "new",
  "open",
  "waiting_customer",
  "waiting_internal",
  "resolved",
  "closed",
  "spam",
]

const sources = ["all", "contact_form", "ai_chat", "order_page", "account"]

const columnHelper = createDataTableColumnHelper<AdminSupportTicket>()

function SupportTicketActions({ ticket }: { ticket: AdminSupportTicket }) {
  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <Eye />,
              label: "Open ticket",
              to: `/support-tickets/${ticket.id}`,
            },
          ],
        },
      ]}
    />
  )
}

const columns = [
  columnHelper.accessor("ticket_number", {
    header: "Ticket",
  }),
  columnHelper.accessor("subject", {
    header: "Subject",
  }),
  columnHelper.accessor("customer_email", {
    header: "Customer",
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue()

      return (
        <Badge color={getSupportTicketStatusBadgeColor(status)} size="xsmall">
          {labelizeSupportTicketValue(status)}
        </Badge>
      )
    },
  }),
  columnHelper.accessor("source", {
    header: "Source",
    cell: ({ getValue }) => labelizeSupportTicketValue(getValue()),
  }),
  columnHelper.accessor("category", {
    header: "Category",
    cell: ({ getValue }) => labelizeSupportTicketValue(getValue()),
  }),
  columnHelper.accessor("created_at", {
    header: "Created",
    cell: ({ getValue }) => formatSupportTicketDate(getValue()),
  }),
  columnHelper.accessor("id", {
    header: "",
    cell: ({ row }) => <SupportTicketActions ticket={row.original} />,
  }),
]

const SupportTicketsPage = () => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: limit,
  })
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("new")
  const [source, setSource] = useState("all")
  const offset = useMemo(
    () => pagination.pageIndex * pagination.pageSize,
    [pagination],
  )
  const query = useMemo<SupportTicketQueryParams>(
    () => ({
      limit,
      offset,
      q,
      ...(status === "all" ? {} : { status }),
      ...(source === "all" ? {} : { source }),
    }),
    [offset, q, source, status],
  )
  const { tickets, count, isLoading } = useSupportTickets(query)
  const table = useDataTable({
    columns,
    data: tickets,
    getRowId: (row) => row.id,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    rowCount: count,
  })

  return (
    <Container>
      <Header
        title="Support Tickets"
        subtitle="Review customer requests, AI handoffs, and support replies."
      />
      <div className="grid gap-3 px-6 py-4 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <Input
          value={q}
          onChange={(event) => {
            setPagination((current) => ({ ...current, pageIndex: 0 }))
            setQ(event.target.value)
          }}
          placeholder="Search ticket, customer, order, or subject"
        />
        <select
          className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm"
          value={status}
          onChange={(event) => {
            setPagination((current) => ({ ...current, pageIndex: 0 }))
            setStatus(event.target.value)
          }}
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {labelizeSupportTicketValue(value)}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm"
          value={source}
          onChange={(event) => {
            setPagination((current) => ({ ...current, pageIndex: 0 }))
            setSource(event.target.value)
          }}
        >
          {sources.map((value) => (
            <option key={value} value={value}>
              {labelizeSupportTicketValue(value)}
            </option>
          ))}
        </select>
      </div>
      <DataTable instance={table}>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Support Tickets",
  icon: ChatBubbleLeftRight,
})

export default SupportTicketsPage
