import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BroomSparkle, Eye, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  DataTableSortingState,
  Input,
  Text,
  toast,
  useDataTable,
  usePrompt,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { ActionMenu } from "../../components/action-menu"
import { Container } from "../../components/container"
import { Header } from "../../components/header"
import {
  useAiProductDrafts,
  useCleanupAiProductDrafts,
  useDeleteAiProductDraft,
  useExportAiProductDrafts,
} from "../../hooks/ai-product-drafts"
import {
  buildAiProductDraftDetailUrl,
  downloadAiProductDraftExport,
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
const defaultFilters = { status: "needs_review" }
const defaultSorting = { id: "created_at", desc: false }
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
  columnHelper.accessor((draft) => getAiProductDraftDisplayName(draft), {
    id: "product_name",
    header: "Product",
    enableSorting: true,
    sortLabel: "Product name",
    sortAscLabel: "A-Z",
    sortDescLabel: "Z-A",
    cell: ({ row }) => (
      <div>
        <Link
          className="text-ui-fg-base hover:text-ui-fg-base-hover focus-visible:shadow-borders-focus rounded-sm font-medium outline-none"
          onClick={(event) => event.stopPropagation()}
          to={buildAiProductDraftDetailUrl(row.original.id)}
        >
          {getAiProductDraftDisplayName(row.original)}
        </Link>
        <Text className="text-ui-fg-subtle" size="small">
          {row.original.product_handle
            ? `/${row.original.product_handle} · `
            : ""}
          {labelizeAiProductDraftValue(row.original.source_agent || "hermes")}
          {row.original.packet_version
            ? ` · v${row.original.packet_version}`
            : ""}
        </Text>
      </div>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    enableSorting: true,
    sortLabel: "Status",
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
    enableSorting: true,
    sortLabel: "Operation",
    cell: ({ row, getValue }) =>
      labelizeAiProductDraftValue(
        getValue() || row.original.requested_operation || "pending"
      ),
  }),
  columnHelper.accessor(
    (draft) => draft.confidence_summary?.overall,
    {
    id: "confidence",
    header: "Confidence",
    enableSorting: true,
    sortLabel: "Confidence",
    sortAscLabel: "Lowest first",
    sortDescLabel: "Highest first",
    cell: ({ getValue }) => {
      const overall = getValue()

      return typeof overall === "number" ? `${Math.round(overall * 100)}%` : "-"
    },
  }),
  columnHelper.accessor((draft) => draft.warnings?.length || 0, {
    id: "warnings",
    header: "Warnings",
    enableSorting: true,
    sortLabel: "Warnings",
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor("created_at", {
    header: "Created",
    enableSorting: true,
    sortLabel: "Created date",
    sortAscLabel: "Oldest first",
    sortDescLabel: "Newest first",
    cell: ({ getValue }) => formatAiProductDraftDate(getValue()),
  }),
  columnHelper.accessor("id", {
    header: "",
    cell: ({ row }) => <DraftActions draft={row.original} />,
  }),
]

const AiProductDraftsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: limit,
  })
  const [q, setQ] = useState(searchParams.get("q") || "")
  const [debouncedQ, setDebouncedQ] = useState(q)
  const [status, setStatus] = useState(
    searchParams.get("status") || defaultFilters.status
  )
  const initialOrder = searchParams.get("order") || "created_at"
  const [sorting, setSorting] = useState<DataTableSortingState | null>({
    id: initialOrder ? initialOrder.replace(/^-/, "") : defaultSorting.id,
    desc: initialOrder ? initialOrder.startsWith("-") : defaultSorting.desc,
  })
  const navigate = useNavigate()
  const prompt = usePrompt()
  const { mutateAsync: cleanupDrafts, isPending: isCleaningUp } =
    useCleanupAiProductDrafts()
  const { mutateAsync: exportDrafts, isPending: isExporting } =
    useExportAiProductDrafts()
  const offset = useMemo(
    () => pagination.pageIndex * pagination.pageSize,
    [pagination]
  )
  const order = sorting
    ? `${sorting.desc ? "-" : ""}${sorting.id}`
    : "created_at"

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [q])

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQ) next.set("q", debouncedQ)
    next.set("status", status)
    next.set("order", order)
    setSearchParams(next, { replace: true })
  }, [debouncedQ, order, setSearchParams, status])

  const query = useMemo<AiProductDraftQueryParams>(
    () => ({
      limit: pagination.pageSize,
      offset,
      order,
      q: debouncedQ,
      ...(status === "all" ? {} : { status }),
    }),
    [debouncedQ, offset, order, pagination.pageSize, status]
  )
  const {
    drafts,
    count,
    statusCounts,
    isError,
    isLoading,
    refetch,
  } = useAiProductDrafts(query)
  const canBulkCleanup =
    status === "validation_failed" &&
    !q.trim() &&
    count > 0 &&
    count <= bulkCleanupLimit

  const handleBulkCleanup = async () => {
    const confirmed = await prompt({
      title: "Clean up validation failures?",
      description: `Soft-delete all ${count} validation-failed drafts? Export them first if you may need the original packets. No Medusa product data will be changed.`,
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

  const handleExport = async () => {
    try {
      const result = await exportDrafts({
        status: "validation_failed",
        expected_count: count,
      })
      downloadAiProductDraftExport(result)
      toast.success("Failed drafts exported", {
        description: `${result.count} validation-failed drafts were downloaded as JSON.`,
      })
    } catch {
      toast.error("Unable to export failed drafts", {
        description:
          "No file was downloaded. Refresh the table and try the export again.",
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
    sorting: {
      state: sorting,
      onSortingChange: (next) => {
        setPagination((current) => ({ ...current, pageIndex: 0 }))
        setSorting(next)
      },
    },
    rowCount: count,
  })

  const queueStatuses = [
    "needs_review",
    "needs_resolution",
    "approved",
    "validation_failed",
  ]

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
                    children: `Export ${count} failed drafts`,
                    disabled: isCleaningUp,
                    isLoading: isExporting,
                    onClick: handleExport,
                    variant: "secondary",
                  },
                },
                {
                  type: "button",
                  props: {
                    children: `Clean up ${count} failed drafts`,
                    disabled: isExporting,
                    isLoading: isCleaningUp,
                    onClick: handleBulkCleanup,
                    variant: "danger",
                  },
                },
              ]
            : []
        }
      />
      <DataTable instance={table}>
        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {queueStatuses.map((queueStatus) => (
              <button
                aria-pressed={status === queueStatus}
                className="border-ui-border-base hover:bg-ui-bg-subtle focus-visible:shadow-borders-focus rounded-lg border p-3 text-left outline-none"
                key={queueStatus}
                onClick={() => {
                  setPagination((current) => ({ ...current, pageIndex: 0 }))
                  setStatus(queueStatus)
                }}
                type="button"
              >
                <Text className="text-ui-fg-subtle" size="small">
                  {labelizeAiProductDraftValue(queueStatus)}
                </Text>
                <Text size="large" weight="plus">
                  {statusCounts[queueStatus] || 0}
                </Text>
              </button>
            ))}
          </div>
          <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 gap-2">
              <Input
                aria-label="Search AI product drafts"
                className="w-full"
                value={q}
                onChange={(event) => {
                  setPagination((current) => ({ ...current, pageIndex: 0 }))
                  setQ(event.target.value)
                }}
                placeholder="Search product, handle, source, or draft id"
              />
              {q ? (
                <Button
                  onClick={() => setQ("")}
                  size="small"
                  variant="secondary"
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter AI product drafts by status"
                className="min-w-0 flex-1 rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm md:flex-none"
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
              <DataTable.SortingMenu tooltip="Sort drafts" />
            </div>
          </div>
        </div>
        {isError ? (
          <div className="m-6 rounded-lg border border-ui-border-error bg-ui-bg-subtle p-4" role="alert">
            <Text weight="plus">Could not load AI product drafts.</Text>
            <Text className="text-ui-fg-subtle" size="small">
              Refresh the queue or try again.
            </Text>
            <Button className="mt-3" onClick={() => refetch()} size="small" variant="secondary">
              Try again
            </Button>
          </div>
        ) : (
          <DataTable.Table
            emptyState={{
              empty: {
                custom: (
                  <div className="py-10 text-center">
                    <Text weight="plus">
                      {status === "needs_review"
                        ? "No drafts need review"
                        : `No ${labelizeAiProductDraftValue(status).toLowerCase()} drafts`}
                    </Text>
                    <Text className="text-ui-fg-subtle" size="small">
                      {debouncedQ
                        ? "Clear the search or choose another queue."
                        : "New matching drafts will appear here."}
                    </Text>
                  </div>
                ),
              },
              filtered: {
                custom: (
                  <div className="py-10 text-center">
                    <Text weight="plus">No matching drafts</Text>
                    <Text className="text-ui-fg-subtle" size="small">
                      Clear the search or choose another queue.
                    </Text>
                  </div>
                ),
              },
            }}
          />
        )}
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
