import type { Badge } from "@medusajs/ui"
import type React from "react"

type SupportTicketListFilters = {
  category?: string
  q?: string
  source?: string
  status?: string
}

type BadgeColor = React.ComponentProps<typeof Badge>["color"]

export const formatSupportTicketDate = (
  value?: string | Date | null,
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

export const getSupportTicketStatusBadgeColor = (
  status: string,
): BadgeColor => {
  if (status === "resolved" || status === "closed") return "green"
  if (status === "spam") return "red"
  if (status === "open") return "blue"
  if (status.startsWith("waiting_")) return "purple"

  return "orange"
}

export const labelizeSupportTicketValue = (value?: string | null): string =>
  value
    ? value
        .split("_")
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(" ")
    : "-"

export const buildSupportTicketListUrl = (
  filters: SupportTicketListFilters,
): string => {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "all") {
      params.set(key, value)
    }
  }

  const query = params.toString()
  return `/admin/support-tickets${query ? `?${query}` : ""}`
}
