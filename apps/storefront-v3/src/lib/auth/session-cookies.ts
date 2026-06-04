export const SESSION_COOKIE = "_medusa_authenticated"
export const CUSTOMER_TOKEN_COOKIE = "_medusa_customer_token"
export const GOOGLE_OAUTH_REDIRECT_COOKIE = "google_oauth_redirect"
export const GOOGLE_OAUTH_MODE_COOKIE = "google_oauth_mode"

const SESSION_MAX_AGE = 60 * 60 * 24 * 7
const OAUTH_REDIRECT_MAX_AGE = 60 * 10

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

export function getCustomerSessionCookieOptions() {
  return {
    ...baseCookieOptions,
    maxAge: SESSION_MAX_AGE,
  }
}

export function getGoogleOAuthRedirectCookieOptions() {
  return {
    ...baseCookieOptions,
    maxAge: OAUTH_REDIRECT_MAX_AGE,
  }
}
