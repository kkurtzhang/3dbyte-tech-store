import type { Badge } from "@medusajs/ui"
import type React from "react"

type AiProductDraftListFilters = {
  q?: string
  source_agent?: string
  status?: string
}

type BadgeColor = React.ComponentProps<typeof Badge>["color"]

export const formatAiProductDraftDate = (
  value?: string | Date | null
): string => {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export const getAiProductDraftStatusBadgeColor = (
  status: string
): BadgeColor => {
  if (status === "imported") return "green"
  if (status === "approved") return "blue"
  if (status === "rejected" || status === "validation_failed") return "red"
  if (status === "received") return "grey"

  return "orange"
}

export const labelizeAiProductDraftValue = (value?: string | null): string =>
  value
    ? value
        .split("_")
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(" ")
    : "-"

export const buildAiProductDraftListUrl = (
  filters: AiProductDraftListFilters
): string => {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "all") {
      params.set(key, value)
    }
  }

  const query = params.toString()
  return `/admin/ai-product-drafts${query ? `?${query}` : ""}`
}
