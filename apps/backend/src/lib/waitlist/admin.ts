export type WaitlistAdminEntry = {
  id: string
  customer_email: string
  customer_id?: string | null
  product_id: string
  product_variant_id?: string | null
  product_handle: string
  product_title: string
  variant_title?: string | null
  notified: boolean
  notification_count?: number | null
  created_at?: string | Date | null
  notified_at?: string | Date | null
  last_notified_at?: string | Date | null
}

export type WaitlistStatusFilter = "all" | "queued" | "notified"

export type WaitlistDemandRow = {
  product_id: string
  product_variant_id: string | null
  product_handle: string
  product_title: string
  variant_title: string | null
  queued_count: number
  notified_count: number
  total_count: number
}

type WaitlistFilter = {
  product_id?: string
  q?: string
  status?: WaitlistStatusFilter
}

const normalizeDate = (value?: string | Date | null): string =>
  value instanceof Date ? value.toISOString() : value || ""

const variantKey = (entry: Pick<WaitlistAdminEntry, "product_variant_id">) =>
  entry.product_variant_id || ""

export const buildWaitlistDemand = (
  entries: WaitlistAdminEntry[],
): WaitlistDemandRow[] => {
  const demand = new Map<string, WaitlistDemandRow>()

  for (const entry of entries) {
    const key = `${entry.product_id}:${variantKey(entry)}`
    const current =
      demand.get(key) ||
      ({
        product_id: entry.product_id,
        product_variant_id: entry.product_variant_id || null,
        product_handle: entry.product_handle,
        product_title: entry.product_title,
        variant_title: entry.variant_title || null,
        queued_count: 0,
        notified_count: 0,
        total_count: 0,
      } satisfies WaitlistDemandRow)

    demand.set(key, {
      ...current,
      queued_count: current.queued_count + (entry.notified ? 0 : 1),
      notified_count: current.notified_count + (entry.notified ? 1 : 0),
      total_count: current.total_count + 1,
    })
  }

  return Array.from(demand.values()).sort((a, b) => {
    if (b.queued_count !== a.queued_count) {
      return b.queued_count - a.queued_count
    }

    if (b.total_count !== a.total_count) {
      return b.total_count - a.total_count
    }

    return a.product_title.localeCompare(b.product_title)
  })
}

export const filterWaitlistEntries = (
  entries: WaitlistAdminEntry[],
  filter: WaitlistFilter,
): WaitlistAdminEntry[] => {
  const q = filter.q?.trim().toLowerCase()
  const status = filter.status || "all"

  return entries.filter((entry) => {
    if (filter.product_id && entry.product_id !== filter.product_id) {
      return false
    }

    if (status === "queued" && entry.notified) {
      return false
    }

    if (status === "notified" && !entry.notified) {
      return false
    }

    if (!q) {
      return true
    }

    return [
      entry.customer_email,
      entry.product_title,
      entry.variant_title,
      entry.product_handle,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(q))
  })
}

const escapeCsv = (value: unknown): string => {
  const text = String(value ?? "")
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const buildWaitlistCsv = (entries: WaitlistAdminEntry[]): string => {
  const header = [
    "id",
    "email",
    "customer_id",
    "product_id",
    "product_variant_id",
    "product_title",
    "variant_title",
    "product_handle",
    "notified",
    "notification_count",
    "created_at",
    "last_notified_at",
  ]

  const rows = entries.map((entry) =>
    [
      entry.id,
      entry.customer_email,
      entry.customer_id || "",
      entry.product_id,
      entry.product_variant_id || "",
      entry.product_title,
      entry.variant_title || "",
      entry.product_handle,
      entry.notified,
      entry.notification_count || 0,
      normalizeDate(entry.created_at),
      normalizeDate(entry.last_notified_at),
    ]
      .map(escapeCsv)
      .join(","),
  )

  return [header.join(","), ...rows].join("\n")
}

export const getMarkNotifiedPayload = (
  entry: Pick<
    WaitlistAdminEntry,
    "id" | "notification_count" | "notified_at"
  >,
  now = new Date(),
) => {
  const timestamp = now.toISOString()

  return {
    id: entry.id,
    notified: true,
    notified_at: normalizeDate(entry.notified_at) || timestamp,
    last_notified_at: timestamp,
    notification_count: (entry.notification_count || 0) + 1,
  }
}

export const paginateWaitlistEntries = <T>(
  entries: T[],
  limit: number,
  offset: number,
): T[] => entries.slice(offset, offset + limit)
