import type { MedusaRequest } from "@medusajs/framework/http"

import {
  filterWaitlistEntries,
  paginateWaitlistEntries,
  type WaitlistAdminEntry,
  type WaitlistStatusFilter,
} from "../../../lib/waitlist/admin"

export const getWaitlistModule = (req: MedusaRequest) =>
  req.scope.resolve<any>("waitlist")

export const listAdminWaitlistEntries = async (
  req: MedusaRequest,
): Promise<WaitlistAdminEntry[]> => {
  const waitlistModule = getWaitlistModule(req)
  return await waitlistModule.listWaitlistEntries({})
}

export const parseLimit = (value: unknown, defaultValue = 20): number => {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return defaultValue
  }

  return Math.min(parsed, 100)
}

export const parseOffset = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed
}

export const parseStatus = (value: unknown): WaitlistStatusFilter => {
  return value === "queued" || value === "notified" ? value : "all"
}

export const getFilteredEntries = (req: MedusaRequest, entries: WaitlistAdminEntry[]) =>
  filterWaitlistEntries(entries, {
    product_id: typeof req.query.product_id === "string" ? req.query.product_id : undefined,
    q: typeof req.query.q === "string" ? req.query.q : undefined,
    status: parseStatus(req.query.status),
  })

export const getPaginatedEntries = (req: MedusaRequest, entries: WaitlistAdminEntry[]) => {
  const limit = parseLimit(req.query.limit)
  const offset = parseOffset(req.query.offset)

  return {
    entries: paginateWaitlistEntries(entries, limit, offset),
    limit,
    offset,
  }
}

export const getWaitlistEntryById = async (
  req: MedusaRequest,
  id: string,
): Promise<WaitlistAdminEntry | null> => {
  const waitlistModule = getWaitlistModule(req)
  const [entry] = await waitlistModule.listWaitlistEntries({ id })

  return entry || null
}
