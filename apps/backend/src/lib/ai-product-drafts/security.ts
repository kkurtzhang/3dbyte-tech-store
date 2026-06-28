import { timingSafeEqual } from "crypto"

import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getRequestHeader } from "../../api/ai/_utils"

const HERMES_TOKEN_HEADER = "x-3db-hermes-product-draft-token"

function getHermesProductDraftMaxBytes() {
  const configured = Number.parseInt(
    process.env.AI_PRODUCT_DRAFT_MAX_BYTES || "262144",
    10
  )

  return Number.isFinite(configured) && configured > 0 ? configured : 262144
}

function safeTokenEquals(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)

  if (actualBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(actualBuffer, expectedBuffer)
}

export function authorizeHermesProductDraftRequest(
  req: MedusaRequest,
  res: MedusaResponse
): boolean {
  const configuredToken = process.env.HERMES_PRODUCT_DRAFT_TOKEN?.trim()

  if (!configuredToken) {
    res.status(503).json({ error: "Hermes product draft token is not configured" })
    return false
  }

  const requestToken = getRequestHeader(req, HERMES_TOKEN_HEADER).trim()

  if (!requestToken || !safeTokenEquals(requestToken, configuredToken)) {
    res.status(401).json({ error: "Unauthorized" })
    return false
  }

  return true
}

export function getHermesProductDraftTokenHeader() {
  return HERMES_TOKEN_HEADER
}

export function isHermesProductDraftPayloadTooLarge(body: unknown) {
  return (
    Buffer.byteLength(JSON.stringify(body ?? null), "utf8") >
    getHermesProductDraftMaxBytes()
  )
}

export async function hermesProductDraftPayloadLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const maxBytes = getHermesProductDraftMaxBytes()
  const contentLength = Number.parseInt(
    getRequestHeader(req, "content-length") || "0",
    10
  )

  if (
    Number.isFinite(maxBytes) &&
    maxBytes > 0 &&
    Number.isFinite(contentLength) &&
    contentLength > maxBytes
  ) {
    res.status(413).json({ error: "Product research packet is too large" })
    return
  }

  next()
}
