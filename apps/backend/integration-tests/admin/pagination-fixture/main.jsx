import React from "react"
import { createRoot } from "react-dom/client"
import { TooltipProvider } from "@medusajs/ui"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@medusajs/dashboard/css"
import "./utilities.css"
import AiProductDraftsPage from "../../../src/admin/routes/ai-product-drafts/page"
import { sdk } from "../../../src/admin/lib/sdk"

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const records = Array.from({ length: 47 }, (_, index) => ({
  id: `draft_${String(index + 1).padStart(2, "0")}`,
  status: "needs_review",
  product_input: { product_name: `Fixture Product ${String(index + 1).padStart(2, "0")}` },
  product_handle: `fixture-product-${index + 1}`,
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

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={client}>
    <TooltipProvider><BrowserRouter>
      <div className="flex h-screen w-full flex-col overflow-auto">
        <div className="shrink-0 border-b px-6 py-4">Admin pagination fixture · synthetic data only</div>
        <main className="flex h-full w-full flex-col items-center overflow-y-auto">
          <div className="flex w-full max-w-[1600px] flex-col gap-y-2 p-3"><AiProductDraftsPage /></div>
          <aside className="p-3"><button onClick={shrinkQueue}>Simulate queue shrink</button><output id="request" aria-label="Last list request" /></aside>
        </main>
      </div>
    </BrowserRouter></TooltipProvider>
  </QueryClientProvider>
)
