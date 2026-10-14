import React from "react"
import { createRoot } from "react-dom/client"
import { TooltipProvider } from "@medusajs/ui"
import { createBrowserRouter, RouterProvider, Link } from "react-router-dom"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { Shell } from "@fixture/medusa-shell"
import { SidebarProvider } from "@fixture/medusa-sidebar"
import { DataTableRoot } from "@fixture/medusa-native-table"
import { useReactTable, getCoreRowModel } from "@tanstack/react-table"
import translations from "@fixture/translations"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@medusajs/dashboard/css"
import "./utilities.css"
import AiProductDraftsPage from "../../../src/admin/routes/ai-product-drafts/page"
import { sdk } from "../../../src/admin/lib/sdk"

i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: translations } }, interpolation: { escapeValue: false } })
const longRows = new URLSearchParams(location.search).has("long")
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const records = Array.from({ length: 47 }, (_, index) => ({
  id: `draft_${String(index + 1).padStart(2, "0")}`,
  status: "needs_review",
  product_input: { product_name: `Fixture Product ${String(index + 1).padStart(2, "0")}${longRows ? " — Detailed manufacturer research title with a long variant name".repeat(3) : ""}` },
  product_handle: `fixture-product-${index + 1}${longRows ? "-very-long-research-source-handle".repeat(6) : ""}`,
  source_agent: "hermes",
  created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  warnings: [],
}))
const failures = records.slice(0, 31).map((draft) => ({ ...draft, id: `failed_${draft.id}`, status: "validation_failed" }))
let visibleRecords = [...records, ...failures]

sdk.client.fetch = async (path, options = {}) => {
  if (options.method && options.method.toLowerCase() !== "get") throw new Error("Fixture mutations are disabled")
  if (path !== "/admin/ai-product-drafts") throw new Error(`Unexpected fixture request: ${path}`)
  const { limit = 15, offset = 0, q = "", status, order = "created_at" } = options.query || {}
  document.querySelector("#request").textContent = JSON.stringify(options.query)
  if (q === "error") throw new Error("Fixture list error")
  await new Promise((resolve) => setTimeout(resolve, q === "slow" ? 2000 : 30))
  const queue = visibleRecords.filter((draft) => !q || q === "slow" || draft.product_input.product_name.toLowerCase().includes(q.toLowerCase()))
  const matching = queue.filter((draft) => !status || draft.status === status)
  matching.sort((a, b) => {
    const field = order.replace(/^-/, "")
    const value = field === "product_name" ? a.product_input.product_name.localeCompare(b.product_input.product_name) : String(a[field]).localeCompare(String(b[field]))
    return order.startsWith("-") ? -value : value
  })
  return {
    drafts: matching.slice(offset, offset + limit), count: matching.length, limit, offset,
    status_counts: Object.fromEntries(["needs_review", "validation_failed"].map((value) => [value, queue.filter((draft) => draft.status === value).length])),
  }
}

const shrinkQueue = () => {
  visibleRecords = visibleRecords.filter((draft) => draft.status !== "needs_review" || draft.id === "draft_01")
  client.invalidateQueries({ queryKey: ["ai-product-drafts"] })
}

const nativeColumns = [{ accessorKey: "id", header: "Product", cell: ({ getValue }) => <span>{getValue()}</span> }]
function NativeReference() {
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 15 })
  const table = useReactTable({ data: records.slice(pagination.pageIndex * 15, (pagination.pageIndex + 1) * 15), columns: nativeColumns, state: { pagination }, onPaginationChange: setPagination, rowCount: records.length, manualPagination: true, getCoreRowModel: getCoreRowModel() })
  return <DataTableRoot table={table} columns={nativeColumns} count={records.length} pagination pageSize={15} layout="fit" />
}
function FixtureShell() {
  return <SidebarProvider><Shell><aside className="flex flex-1 flex-col justify-between overflow-y-auto"><div className="p-3"><p>Medusa Shell fixture</p><p>Synthetic data only</p><Link to="/">AI Product Drafts</Link><br/><Link to="/native-table">Native Products table pattern</Link></div></aside></Shell></SidebarProvider>
}
const router = createBrowserRouter([{ element: <FixtureShell />, children: [
  { path: "/", element: <AiProductDraftsPage /> },
  { path: "/native-table", element: <NativeReference />, handle: { breadcrumb: () => "Native table reference" } },
]}])
createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={client}>
    <TooltipProvider><RouterProvider router={router} /><aside style={{ position: "fixed", left: 0, bottom: 0, zIndex: 100 }}><button onClick={shrinkQueue}>Simulate queue shrink</button><output id="request" aria-label="Last list request" hidden /></aside></TooltipProvider>
  </QueryClientProvider>
)
