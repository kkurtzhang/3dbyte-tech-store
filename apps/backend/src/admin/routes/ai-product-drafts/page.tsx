import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BroomSparkle, Eye, Trash } from "@medusajs/icons"
import {
  Badge,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  Input,
  Text,
  toast,
  useDataTable,
  usePrompt,
} from "@medusajs/ui"
import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { ActionMenu } from "../../components/action-menu"
import { Container } from "../../components/container"
import { Header } from "../../components/header"
import {
  useAiProductDrafts,
  useCleanupAiProductDrafts,
  useDeleteAiProductDraft,
} from "../../hooks/ai-product-drafts"
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
const bulkCleanupLimit = 500
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
  const prompt = usePrompt()
  const { mutateAsync: deleteDraft, isPending } = useDeleteAiProductDraft(
    draft.id
  )
  const canDelete = ["validation_failed", "rejected"].includes(draft.status)

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: "Delete AI product draft?",
      description: `Remove ${displayName} from the draft table? The record will be soft-deleted and no product data will be changed.`,
    })

    if (!confirmed) return

    try {
      await deleteDraft()
      toast.success("Draft deleted", {
        description: `${displayName} was removed from the draft table.`,
      })
    } catch {
      toast.error("Unable to delete draft", {
        description:
          "The draft was not removed. Refresh the table and try again.",
      })
    }
  }

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
        {
          actions: canDelete
            ? [
                {
                  destructive: true,
                  disabled: isPending,
                  icon: <Trash />,
                  label: "Delete draft",
                  onClick: handleDelete,
                },
              ]
            : [],
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
  const prompt = usePrompt()
  const { mutateAsync: cleanupDrafts, isPending: isCleaningUp } =
    useCleanupAiProductDrafts()
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
  const canBulkCleanup =
    status === "validation_failed" &&
    !q.trim() &&
    count > 0 &&
    count <= bulkCleanupLimit

  const handleBulkCleanup = async () => {
    const confirmed = await prompt({
      title: "Clean up validation failures?",
      description: `Soft-delete all ${count} validation-failed drafts currently shown by this filter? No Medusa product data will be changed.`,
    })

    if (!confirmed) return

    try {
      const result = await cleanupDrafts({
        status: "validation_failed",
        expected_count: count,
      })
      setPagination((current) => ({ ...current, pageIndex: 0 }))
      toast.success("Failed drafts cleaned up", {
        description: `${result.count} validation-failed drafts were removed from the table.`,
      })
    } catch {
      toast.error("Unable to clean up failed drafts", {
        description:
          "No drafts were removed. Refresh the table and confirm the cleanup again.",
      })
    }
  }
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
        actions={
          canBulkCleanup
            ? [
                {
                  type: "button",
                  props: {
                    children: `Clean up ${count} failed drafts`,
                    isLoading: isCleaningUp,
                    onClick: handleBulkCleanup,
                    variant: "danger",
                  },
                },
              ]
            : []
        }
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
