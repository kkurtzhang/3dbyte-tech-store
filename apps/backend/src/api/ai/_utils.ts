import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

type RequestWithHeaders = MedusaRequest & {
  get?: (name: string) => string | undefined
  headers?: Record<string, string | string[] | undefined> | Headers
}

export type AiRouteBody = Record<string, unknown>

export function getRequestHeader(req: MedusaRequest, name: string): string {
  const request = req as RequestWithHeaders
  const directHeader = request.get?.(name)

  if (directHeader) return directHeader

  if (request.headers instanceof Headers) {
    return request.headers.get(name) ?? ""
  }

  const lowerName = name.toLowerCase()
  const value = request.headers?.[lowerName] ?? request.headers?.[name]

  if (Array.isArray(value)) return value[0] ?? ""

  return value ?? ""
}

export function authorizeInternalAiRequest(
  req: MedusaRequest,
  res: MedusaResponse
): boolean {
  const configuredToken = process.env.INTERNAL_API_TOKEN?.trim()

  if (!configuredToken) {
    res.status(503).json({ error: "Internal AI token is not configured" })
    return false
  }

  if (getRequestHeader(req, "x-3db-internal-token") !== configuredToken) {
    res.status(401).json({ error: "Unauthorized" })
    return false
  }

  return true
}

export function getTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function normalizeEmail(value: unknown): string {
  return getTrimmedString(value).toLowerCase()
}

export function getPositiveInteger(
  value: unknown,
  fallback: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return fallback
  }

  return Math.min(value, max)
}
