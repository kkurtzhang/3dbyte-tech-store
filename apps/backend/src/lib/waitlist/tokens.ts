import { createHmac, timingSafeEqual } from "crypto"

type TokenPayload = {
  email: string
  waitlist_id: string
}

type CreateTokenInput = {
  email: string
  secret: string
  waitlistId: string
}

type VerifyTokenInput = {
  secret: string
}

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase()

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))

const toBase64Url = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url")

const fromBase64Url = (value: string): string =>
  Buffer.from(value, "base64url").toString("utf8")

const sign = (payload: string, secret: string): string =>
  createHmac("sha256", secret).update(payload).digest("base64url")

export const createWaitlistManageToken = ({
  email,
  secret,
  waitlistId,
}: CreateTokenInput): string => {
  const payload = toBase64Url(
    JSON.stringify({
      email: normalizeEmail(email),
      waitlist_id: waitlistId,
    } satisfies TokenPayload),
  )

  return `${payload}.${sign(payload, secret)}`
}

export const verifyWaitlistManageToken = (
  token: string,
  { secret }: VerifyTokenInput,
): TokenPayload | null => {
  const [payload, signature] = token.split(".")

  if (!payload || !signature) {
    return null
  }

  const expected = sign(payload, secret)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as TokenPayload
    if (!parsed.waitlist_id || !isValidEmail(parsed.email)) {
      return null
    }

    return {
      email: normalizeEmail(parsed.email),
      waitlist_id: parsed.waitlist_id,
    }
  } catch {
    return null
  }
}
