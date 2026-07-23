import { createHmac, timingSafeEqual } from "node:crypto"

type CreateOrderAccessTokenOptions = {
  orderId: string
  secret: string
  now?: number
  ttlSeconds?: number
}

type VerifyOrderAccessTokenOptions = {
  token: string | null | undefined
  orderId: string
  secret: string
  now?: number
}

const DEFAULT_TTL_SECONDS = 60 * 60
const MINIMUM_SECRET_LENGTH = 32

function assertValidSecret(secret: string): void {
  if (secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error("ORDER_ACCESS_TOKEN_SECRET must be at least 32 characters")
  }
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  )
}

export function createOrderAccessToken({
  orderId,
  secret,
  now = Date.now(),
  ttlSeconds = DEFAULT_TTL_SECONDS,
}: CreateOrderAccessTokenOptions): string {
  assertValidSecret(secret)

  if (!orderId || !Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("A valid order ID and positive token lifetime are required")
  }

  const encodedOrderId = Buffer.from(orderId, "utf8").toString("base64url")
  const expiresAt = Math.floor(now / 1000) + Math.floor(ttlSeconds)
  const payload = `${encodedOrderId}.${expiresAt}`

  return `${payload}.${sign(payload, secret)}`
}

export function verifyOrderAccessToken({
  token,
  orderId,
  secret,
  now = Date.now(),
}: VerifyOrderAccessTokenOptions): boolean {
  if (!token || !orderId || secret.length < MINIMUM_SECRET_LENGTH) {
    return false
  }

  const [encodedOrderId, expiresAtValue, actualSignature, ...extraParts] =
    token.split(".")

  if (
    extraParts.length > 0 ||
    !encodedOrderId ||
    !expiresAtValue ||
    !actualSignature
  ) {
    return false
  }

  const expiresAt = Number.parseInt(expiresAtValue, 10)
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(now / 1000)) {
    return false
  }

  let tokenOrderId: string
  try {
    tokenOrderId = Buffer.from(encodedOrderId, "base64url").toString("utf8")
  } catch {
    return false
  }

  if (tokenOrderId !== orderId) {
    return false
  }

  const payload = `${encodedOrderId}.${expiresAtValue}`
  return signaturesMatch(actualSignature, sign(payload, secret))
}
