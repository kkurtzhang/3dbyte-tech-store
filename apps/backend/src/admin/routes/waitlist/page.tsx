import { defineRouteConfig } from "@medusajs/admin-sdk"
import { InformationCircleSolid, Pencil } from "@medusajs/icons"
import {
  Badge,
  Button,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  Heading,
  Input,
  Label,
  toast,
  useDataTable,
} from "@medusajs/ui"
import { useMemo, useState } from "react"

import { ActionMenu } from "../../components/action-menu"
import { Container } from "../../components/container"
import { Header } from "../../components/header"
import {
  useMarkWaitlistNotified,
  useResendWaitlistNotification,
  useSendWaitlistTestNotification,
  useWaitlistDemand,
  useWaitlistEntries,
} from "../../hooks/waitlist"
import {
  buildWaitlistExportUrl,
  formatWaitlistDate,
  getWaitlistStatusBadgeColor,
} from "../../lib/waitlist"
import type {
  AdminWaitlistDemand,
  AdminWaitlistEntry,
  WaitlistQueryParams,
} from "../../types"

const limit = 15

const demandColumnHelper = createDataTableColumnHelper<AdminWaitlistDemand>()
const entryColumnHelper = createDataTableColumnHelper<AdminWaitlistEntry>()

function WaitlistEntryActions({ entry }: { entry: AdminWaitlistEntry }) {
  const { mutateAsync: markNotified } = useMarkWaitlistNotified()
  const { mutateAsync: resend } = useResendWaitlistNotification()

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <Pencil />,
              label: "Mark notified",
              disabled: entry.notified,
              onClick: async () => {
                await markNotified(entry.id)
                toast.success("", { description: "Waitlist row marked notified." })
              },
            },
            {
              icon: <InformationCircleSolid />,
              label: "Resend notification",
              onClick: async () => {
                await resend(entry.id)
                toast.success("", { description: "Waitlist notification sent." })
              },
            },
          ],
        },
      ]}
    />
  )
}

const demandColumns = [
  demandColumnHelper.accessor("product_title", {
    header: "Product",
  }),
  demandColumnHelper.accessor("variant_title", {
    header: "Variant",
    cell: ({ getValue }) => getValue() || "-",
  }),
  demandColumnHelper.accessor("queued_count", {
    header: "Queued",
  }),
  demandColumnHelper.accessor("notified_count", {
    header: "Notified",
  }),
  demandColumnHelper.accessor("total_count", {
    header: "Total",
  }),
]

const entryColumns = [
  entryColumnHelper.accessor("customer_email", {
    header: "Email",
  }),
  entryColumnHelper.accessor("product_title", {
    header: "Product",
  }),
  entryColumnHelper.accessor("variant_title", {
    header: "Variant",
    cell: ({ getValue }) => getValue() || "-",
  }),
  entryColumnHelper.accessor("notified", {
    header: "Status",
    cell: ({ getValue }) => {
      const notified = getValue()
      return (
        <Badge color={getWaitlistStatusBadgeColor(notified)} size="xsmall">
          {notified ? "Notified" : "Queued"}
        </Badge>
      )
    },
  }),
  entryColumnHelper.accessor("notification_count", {
    header: "Sends",
    cell: ({ getValue }) => getValue() || 0,
  }),
  entryColumnHelper.accessor("created_at", {
    header: "Joined",
    cell: ({ getValue }) => formatWaitlistDate(getValue()),
  }),
  entryColumnHelper.accessor("id", {
    header: "",
    cell: ({ row }) => <WaitlistEntryActions entry={row.original} />,
  }),
]

function TestSendForm({ defaultWaitlistId }: { defaultWaitlistId?: string }) {
  const [email, setEmail] = useState("")
  const [waitlistId, setWaitlistId] = useState(defaultWaitlistId || "")
  const { mutateAsync: sendTest, isPending } = useSendWaitlistTestNotification()

  return (
    <form
      className="grid gap-3 px-6 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      onSubmit={async (event) => {
        event.preventDefault()
        await sendTest({ email, waitlist_id: waitlistId })
        toast.success("", { description: "Test waitlist notification sent." })
      }}
    >
      <div className="flex flex-col gap-1">
        <Label size="small">Waitlist ID</Label>
        <Input
          value={waitlistId}
          onChange={(event) => setWaitlistId(event.target.value)}
          placeholder="wait_..."
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label size="small">Test email</Label>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="owner@example.com"
        />
      </div>
      <Button
        className="self-end"
        disabled={!email || !waitlistId}
        isLoading={isPending}
        size="small"
        type="submit"
        variant="secondary"
      >
        Send test
      </Button>
    </form>
  )
}

const WaitlistPage = () => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: limit,
  })
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<WaitlistQueryParams["status"]>("queued")
  const offset = useMemo(
    () => pagination.pageIndex * pagination.pageSize,
    [pagination],
  )
  const query = useMemo(
    () => ({ limit, offset, q, status }),
    [offset, q, status],
  )
  const { demand, isLoading: demandLoading } = useWaitlistDemand({ q, status })
  const { entries, count, isLoading: entriesLoading } = useWaitlistEntries(query)
  const firstEntryId = entries[0]?.id

  const demandTable = useDataTable({
    columns: demandColumns,
    data: demand,
    getRowId: (row) => `${row.product_id}:${row.product_variant_id || ""}`,
    isLoading: demandLoading,
    rowCount: demand.length,
  })
  const entriesTable = useDataTable({
    columns: entryColumns,
    data: entries,
    getRowId: (row) => row.id,
    isLoading: entriesLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    rowCount: count,
  })

  return (
    <Container>
      <Header
        title="Waitlist"
        subtitle="Review product demand, queued subscribers, and manual notifications."
        actions={[
          {
            type: "button",
            props: {
              children: "Export CSV",
              onClick: () => {
                window.location.assign(buildWaitlistExportUrl({ q, status }))
              },
              variant: "secondary",
            },
          },
        ]}
      />
      <div className="grid gap-3 px-6 py-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <Input
          value={q}
          onChange={(event) => {
            setPagination((current) => ({ ...current, pageIndex: 0 }))
            setQ(event.target.value)
          }}
          placeholder="Search email, product, or variant"
        />
        <select
          className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm"
          value={status}
          onChange={(event) => {
            setPagination((current) => ({ ...current, pageIndex: 0 }))
            setStatus(event.target.value as WaitlistQueryParams["status"])
          }}
        >
          <option value="queued">Queued</option>
          <option value="notified">Notified</option>
          <option value="all">All</option>
        </select>
      </div>
      <TestSendForm defaultWaitlistId={firstEntryId} />
      <div className="px-6 py-4">
        <Heading level="h3">Product demand</Heading>
      </div>
      <DataTable instance={demandTable}>
        <DataTable.Table />
      </DataTable>
      <div className="px-6 py-4">
        <Heading level="h3">Subscribers</Heading>
      </div>
      <DataTable instance={entriesTable}>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Waitlist",
  icon: InformationCircleSolid,
})

export default WaitlistPage
