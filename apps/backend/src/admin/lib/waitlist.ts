import type { Badge } from "@medusajs/ui"
import type React from "react"

type WaitlistExportFilters = {
  product_id?: string
  q?: string
  status?: string
}

type BadgeColor = React.ComponentProps<typeof Badge>["color"]

export const formatWaitlistDate = (
  value?: string | Date | null,
): string => {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value))
}

export const getWaitlistStatusBadgeColor = (
  notified: boolean,
): BadgeColor => (notified ? "green" : "orange")

export const buildWaitlistExportUrl = (
  filters: WaitlistExportFilters,
): string => {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value)
    }
  }

  const query = params.toString()
  return `/admin/waitlist/export.csv${query ? `?${query}` : ""}`
}
