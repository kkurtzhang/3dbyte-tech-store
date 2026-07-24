import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BroomSparkle, Eye } from "@medusajs/icons"
import {
  Badge,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  Input,
  Text,
  useDataTable,
} from "@medusajs/ui"
import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { ActionMenu } from "../../components/action-menu"
import { Container } from "../../components/container"
import { Header } from "../../components/header"
import { useAiProductDrafts } from "../../hooks/ai-product-drafts"
import {
  buildAiProductDraftDetailUrl,
  formatAiProductDraftDate,
  getAiProductDraftDisplayName,
  getAiProductDraftStatusBadgeColor,
  labelizeAiProductDraftValue,
} from "../../lib/ai-product-drafts"
import type {
  AdminAiProductDraft,
  AiProductDraftQueryParams,
} from "../../types"

const limit = 15
const statuses = [
  "all",
  "needs_resolution",
  "needs_review",
  "validation_failed",
  "approved",
  "rejected",
  "imported",
  "received",
]

const columnHelper = createDataTableColumnHelper<AdminAiProductDraft>()

function DraftActions({ draft }: { draft: AdminAiProductDraft }) {
  const displayName = getAiProductDraftDisplayName(draft)

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <Eye />,
              label: "Open draft",
              to: buildAiProductDraftDetailUrl(draft.id),
            },
          ],
        },
      ]}
      triggerLabel={`Actions for ${displayName}`}
    />
  )
}

const columns = [
  columnHelper.accessor("product_handle", {
    header: "Product",
    cell: ({ row, getValue }) => (
      <div>
        <Link
          className="text-ui-fg-base hover:text-ui-fg-base-hover focus-visible:shadow-borders-focus rounded-sm font-medium outline-none"
          onClick={(event) => event.stopPropagation()}
          to={buildAiProductDraftDetailUrl(row.original.id)}
        >
          {getAiProductDraftDisplayName(row.original)}
        </Link>
        <Text className="text-ui-fg-subtle" size="small">
          {getValue()
            ? `/${getValue()}`
            : `Source: ${labelizeAiProductDraftValue(
                row.original.source_agent || "hermes"
              )}`}
        </Text>
      </div>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue()

      return (
        <Badge color={getAiProductDraftStatusBadgeColor(status)} size="xsmall">
          {labelizeAiProductDraftValue(status)}
        </Badge>
      )
    },
  }),
  columnHelper.accessor("resolved_operation", {
    header: "Operation",
    cell: ({ row, getValue }) =>
      labelizeAiProductDraftValue(
        getValue() || row.original.requested_operation || "pending"
      ),
  }),
  columnHelper.accessor("confidence_summary", {
    header: "Confidence",
    cell: ({ getValue }) => {
      const summary = getValue() || {}
      const overall = summary.overall

      return typeof overall === "number" ? `${Math.round(overall * 100)}%` : "-"
    },
  }),
  columnHelper.accessor("warnings", {
    header: "Warnings",
    cell: ({ getValue }) => getValue()?.length || 0,
  }),
  columnHelper.accessor("created_at", {
    header: "Created",
    cell: ({ getValue }) => formatAiProductDraftDate(getValue()),
  }),
  columnHelper.accessor("id", {
    header: "",
    cell: ({ row }) => <DraftActions draft={row.original} />,
  }),
]

const AiProductDraftsPage = () => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: limit,
  })
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const navigate = useNavigate()
  const offset = useMemo(
    () => pagination.pageIndex * pagination.pageSize,
    [pagination]
  )
  const query = useMemo<AiProductDraftQueryParams>(
    () => ({
      limit: pagination.pageSize,
      offset,
      q,
      ...(status === "all" ? {} : { status }),
    }),
    [offset, pagination.pageSize, q, status]
  )
  const { drafts, count, isLoading } = useAiProductDrafts(query)
  const table = useDataTable({
    columns,
    data: drafts,
    getRowId: (row) => row.id,
    isLoading,
    onRowClick: (_event, row) => {
      navigate(buildAiProductDraftDetailUrl(row.id))
    },
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    rowCount: count,
  })

  return (
    <Container>
      <Header
        title="AI Product Drafts"
        subtitle="Review Hermes product research before importing metadata and draft content."
      />
      <div className="grid gap-3 px-6 py-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <Input
          aria-label="Search AI product drafts"
          value={q}
          onChange={(event) => {
            setPagination((current) => ({ ...current, pageIndex: 0 }))
            setQ(event.target.value)
          }}
          placeholder="Search product, handle, source, or draft id"
        />
        <select
          aria-label="Filter AI product drafts by status"
          className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm"
          value={status}
          onChange={(event) => {
            setPagination((current) => ({ ...current, pageIndex: 0 }))
            setStatus(event.target.value)
          }}
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {labelizeAiProductDraftValue(value)}
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
  label: "AI Product Drafts",
  icon: BroomSparkle,
})

export default AiProductDraftsPage
