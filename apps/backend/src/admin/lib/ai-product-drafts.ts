import type { Badge } from "@medusajs/ui"
import type React from "react"

import type { AdminAiProductDraft } from "../types"

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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const asTrimmedString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : ""

export const buildAiProductDraftDetailUrl = (id: string): string =>
  `/ai-product-drafts/${encodeURIComponent(id)}`

export const getAiProductDraftDisplayName = (
  draft: Pick<
    AdminAiProductDraft,
    "id" | "normalized_draft" | "product_handle" | "product_id" | "product_input"
  >
): string => {
  const normalizedTarget = asRecord(
    asRecord(draft.normalized_draft).target_product
  )

  return (
    asTrimmedString(asRecord(draft.product_input).product_name) ||
    asTrimmedString(normalizedTarget.product_title) ||
    asTrimmedString(draft.product_handle) ||
    asTrimmedString(draft.product_id) ||
    `Draft ${draft.id}`
  )
}

export const getAiProductDraftActionAvailability = (status: string) => ({
  canApprove: status === "needs_review",
  canImport: status === "approved",
  canReject: [
    "received",
    "validation_failed",
    "needs_review",
    "approved",
  ].includes(status),
})

export const getAiProductDraftReviewIssues = (
  draft: Pick<AdminAiProductDraft, "validation_errors" | "warnings">
): string[] => {
  const warnings = (draft.warnings || [])
    .map(asTrimmedString)
    .filter(Boolean)
  const seenMessages = new Set(warnings)
  const validationIssues = (draft.validation_errors || [])
    .map((value) => {
      const entry = asRecord(value)
      const message =
        asTrimmedString(entry.message) || asTrimmedString(value)
      const path = asTrimmedString(entry.path)

      if (!message || seenMessages.has(message)) {
        return ""
      }

      seenMessages.add(message)
      return path ? `${path}: ${message}` : message
    })
    .filter(Boolean)

  return [...warnings, ...validationIssues]
}
