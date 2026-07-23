export const ORDER_ACCESS_COOKIE = "_3db_order_access"
export const ORDER_ACCESS_MAX_AGE_SECONDS = 60 * 60

export function getOrderAccessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/order/confirmed",
    maxAge: ORDER_ACCESS_MAX_AGE_SECONDS,
  }
}

export function getOrderAccessTokenSecret(): string {
  const secret = process.env.ORDER_ACCESS_TOKEN_SECRET?.trim()

  if (!secret || secret.length < 32) {
    throw new Error(
      "ORDER_ACCESS_TOKEN_SECRET must be configured with at least 32 characters"
    )
  }

  return secret
}
