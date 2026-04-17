"use client"

import { AlertTriangle, Clock3, Package } from "lucide-react"
import type { MedusaCartLineItem } from "@/lib/medusa/cart"
import { analyzeCartContents } from "@/lib/util/cart-analysis"

interface CartNoticesProps {
  items?: MedusaCartLineItem[] | null
  currencyCode: string
}

function formatAvailabilityDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

function formatMinorAmount(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount / 100)
}

function buildCompactNoticeRows(
  items: MedusaCartLineItem[] | null | undefined,
  currencyCode: string
) {
  const analysis = analyzeCartContents(items)
  const rows: Array<{ icon: "clock" | "package" | "alert"; text: string }> = []

  if (analysis.hasPreorderItems && analysis.earliestPreorderDate) {
    rows.push({
      icon: "clock",
      text: `Pre-order arrival est. ${formatAvailabilityDate(analysis.earliestPreorderDate)}`,
    })
  }

  if (analysis.bundleGroups.length > 0) {
    const bundleCount = analysis.bundleGroups.length
    const bundleLabel = `${bundleCount} ${bundleCount === 1 ? "curated bundle" : "curated bundles"}`
    const savingsSuffix =
      analysis.bundleSavingsTotal > 0
        ? ` • ${formatMinorAmount(analysis.bundleSavingsTotal, currencyCode)} saved`
        : ""

    rows.push({
      icon: "package",
      text: `${bundleLabel} in this cart${savingsSuffix}`,
    })
  }

  if (analysis.isMixedCart) {
    rows.push({
      icon: "alert",
      text: "Ships in multiple deliveries when pre-order stock arrives",
    })
  }

  return rows
}

export function getCompactCartNoticeLines(
  items: MedusaCartLineItem[] | null | undefined
) {
  const analysis = analyzeCartContents(items)
  const lines: string[] = []

  if (analysis.hasPreorderItems && analysis.earliestPreorderDate) {
    lines.push(
      `Includes pre-order items (est. ${formatAvailabilityDate(analysis.earliestPreorderDate)})`
    )
  }

  if (analysis.bundleGroups.length > 0) {
    const bundleLabel = `${analysis.bundleGroups.length} ${analysis.bundleGroups.length === 1 ? "bundle" : "bundles"}`
    lines.push(`Includes ${bundleLabel}`)
  }

  return lines
}

export function CompactCartNoticeSummary({
  items,
  currencyCode,
}: CartNoticesProps) {
  const rows = buildCompactNoticeRows(items, currencyCode)

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        Cart Notes
      </p>
      <div className="mt-2 space-y-2">
        {rows.map((row) => {
          const Icon =
            row.icon === "clock"
              ? Clock3
              : row.icon === "package"
                ? Package
                : AlertTriangle

          return (
            <div key={row.text} className="flex items-start gap-2 text-xs text-foreground/85">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p>{row.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CartPagePurchaseBanner({
  items,
  currencyCode,
}: CartNoticesProps) {
  const analysis = analyzeCartContents(items)

  if (
    !analysis.hasPreorderItems &&
    !analysis.isMixedCart &&
    analysis.bundleGroups.length === 0
  ) {
    return null
  }

  const summaryCards = [
    analysis.hasPreorderItems && analysis.earliestPreorderDate
      ? {
          label: "Pre-order ETA",
          value: formatAvailabilityDate(analysis.earliestPreorderDate),
          tone: "text-primary",
        }
      : null,
    analysis.bundleGroups.length > 0
      ? {
          label: "Bundles",
          value: `${analysis.bundleGroups.length} ${analysis.bundleGroups.length === 1 ? "grouped set" : "grouped sets"}`,
          tone: "text-foreground",
        }
      : null,
    analysis.isMixedCart
      ? {
          label: "Delivery",
          value: "Split shipment expectations",
          tone: "text-amber-700",
        }
      : null,
    analysis.bundleSavingsTotal > 0
      ? {
          label: "Bundle Savings",
          value: formatMinorAmount(analysis.bundleSavingsTotal, currencyCode),
          tone: "text-emerald-700",
        }
      : null,
  ].filter((card): card is { label: string; value: string; tone: string } => card !== null)

  return (
    <div className="mb-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.08] via-background to-amber-50/70 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Purchase Status
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            Pre-order and bundle details are active for this cart.
          </h2>
          {analysis.isMixedCart ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              This cart mixes in-stock and pre-order items, so delivery timing can split
              across multiple shipments.
            </p>
          ) : (
            <p className="max-w-2xl text-sm text-muted-foreground">
              Bundle grouping and pre-order timing are called out below so nothing in this
              purchase is ambiguous at checkout.
            </p>
          )}
        </div>
        {analysis.isMixedCart ? (
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-amber-300/70 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" />
            Mixed Cart
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border/70 bg-background/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {card.label}
            </p>
            <p className={`mt-1 text-sm font-medium ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CartNotices({ items, currencyCode }: CartNoticesProps) {
  const analysis = analyzeCartContents(items)
  const shouldRender =
    (analysis.hasPreorderItems && analysis.earliestPreorderDate) ||
    analysis.isMixedCart ||
    analysis.bundleSavingsTotal > 0

  if (!shouldRender) {
    return null
  }

  return (
    <div className="space-y-3">
      {analysis.hasPreorderItems && analysis.earliestPreorderDate ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <div className="flex items-start gap-2">
            <Clock3 className="mt-0.5 h-4 w-4 text-primary" />
            <div className="space-y-1">
              <p className="font-medium text-primary">Pre-order items ship when available</p>
              <p className="text-muted-foreground">
                Earliest estimated availability:{" "}
                {formatAvailabilityDate(analysis.earliestPreorderDate)}.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {analysis.isMixedCart ? (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <p>
              This cart contains both in-stock and pre-order items. In-stock items may
              ship sooner than pre-order items.
            </p>
          </div>
        </div>
      ) : null}

      {analysis.bundleSavingsTotal > 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div className="flex items-start gap-2">
            <Package className="mt-0.5 h-4 w-4" />
            <div className="space-y-1">
              <p className="font-medium">Bundle savings applied</p>
              <p>
                {formatMinorAmount(analysis.bundleSavingsTotal, currencyCode)} saved across
                bundle items.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
