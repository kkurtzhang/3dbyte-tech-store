const mockFetch = jest.fn()
const mockCookieSet = jest.fn()
const mockCookieDelete = jest.fn()
const mockConsoleWarn = jest
  .spyOn(console, "warn")
  .mockImplementation(() => undefined)
const mockRedirect = jest.fn((url: URL | string) => ({
  status: 307,
  headers: new Headers({ location: String(url) }),
  cookies: {
    set: mockCookieSet,
    delete: mockCookieDelete,
  },
}))

jest.mock("next/server", () => ({
  NextResponse: {
    redirect: (url: URL | string) => mockRedirect(url),
  },
}))

const { GET: startGoogleAuth } = jest.requireActual("../start/route")
const { GET: completeGoogleAuth } = jest.requireActual("../callback/route")

function encodeJwtPayload(payload: Record<string, unknown>) {
  return [
    "header",
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "signature",
  ].join(".")
}

function createRequest(url: string, headers?: Record<string, string>) {
  return {
    url,
    headers: new Headers(headers),
  } as Request
}

describe("Google OAuth storefront routes", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    global.fetch = mockFetch as unknown as typeof fetch
    process.env = {
      ...originalEnv,
      MEDUSA_SERVER_BACKEND_URL: "http://medusa:9000",
      NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_test",
    }
  })

  afterAll(() => {
    process.env = originalEnv
    mockConsoleWarn.mockRestore()
  })

  it("starts Google OAuth through Medusa and stores a safe return path", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        location: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
      }),
    })

    const response = await startGoogleAuth(
      createRequest(
        "https://store.staging.example.com/auth/google/start?redirect=/account"
      )
    )

    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=test"
    )
    expect(mockFetch).toHaveBeenCalledWith(
      "http://medusa:9000/auth/customer/google",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-publishable-api-key": "pk_test",
        }),
      })
    )
    expect(JSON.parse(String(mockFetch.mock.calls[0][1].body))).toEqual({
      callback_url: "https://store.staging.example.com/auth/google/callback",
    })
    expect(mockCookieSet).toHaveBeenCalledWith(
      "google_oauth_redirect",
      "/account",
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
  })

  it("stores link mode when Google OAuth starts from account settings", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent_id: "oli_123",
          expires_at: "2026-06-07T12:10:00.000Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          location:
            "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
        }),
      })

    await startGoogleAuth(
      createRequest(
        "https://store.staging.example.com/auth/google/start?mode=link&redirect=/account/settings",
        { cookie: "_medusa_customer_token=customer-session-token" }
      )
    )

    expect(mockFetch.mock.calls[0][0]).toBe(
      "http://medusa:9000/store/customers/me/google-link-intents"
    )
    expect(mockFetch.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer customer-session-token",
        }),
      })
    )
    const intentBody = JSON.parse(String(mockFetch.mock.calls[0][1].body))
    expect(intentBody.nonce).toEqual(expect.any(String))
    expect(intentBody.nonce.length).toBeGreaterThanOrEqual(32)
    expect(mockFetch.mock.calls[1][0]).toBe(
      "http://medusa:9000/auth/customer/google"
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "google_oauth_mode",
      "link",
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "google_oauth_redirect",
      "/account/settings",
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "google_oauth_link_intent",
      "oli_123",
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "google_oauth_link_nonce",
      intentBody.nonce,
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
  })

  it("uses the configured public site URL for the Google callback", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://store.staging.3dbytetech.com.au"
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        location: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
      }),
    })

    await startGoogleAuth(
      createRequest("https://0.0.0.0:3000/auth/google/start?redirect=/account")
    )

    expect(JSON.parse(String(mockFetch.mock.calls[0][1].body))).toEqual({
      callback_url:
        "https://store.staging.3dbytetech.com.au/auth/google/callback",
    })
  })

  it("creates a registered Google customer while leaving same-email guest history intact", async () => {
    const initialToken = encodeJwtPayload({
      actor_id: "",
      user_metadata: { email: "ava@example.com" },
    })
    const refreshedToken = encodeJwtPayload({
      actor_id: "cus_123",
      user_metadata: { email: "ava@example.com" },
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: initialToken }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          message: "No registered customer is available to link",
          guest_available: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: { id: "cus_123", email: "ava@example.com" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: refreshedToken }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customer: { id: "cus_123" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ linked: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    const response = await completeGoogleAuth(
      createRequest(
        "https://store.staging.example.com/auth/google/callback?code=abc&state=xyz",
        {
          cookie: "google_oauth_redirect=/checkout; _medusa_cart_id=cart_123",
        }
      )
    )

    expect(response.headers.get("location")).toBe(
      "https://store.staging.example.com/checkout"
    )
    expect(mockFetch.mock.calls[0][0]).toBe(
      "http://medusa:9000/auth/customer/google/callback?code=abc&state=xyz"
    )
    expect(mockFetch.mock.calls[1][0]).toBe(
      "http://medusa:9000/store/customers/claim-account"
    )
    expect(mockFetch.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${initialToken}`,
          "x-publishable-api-key": "pk_test",
        }),
      })
    )
    expect(JSON.parse(String(mockFetch.mock.calls[1][1].body))).toEqual({
      email: "ava@example.com",
      source: "google",
    })
    expect(mockFetch.mock.calls[2][0]).toBe(
      "http://medusa:9000/store/customers"
    )
    expect(mockFetch.mock.calls[3][0]).toBe(
      "http://medusa:9000/auth/token/refresh"
    )
    expect(mockFetch.mock.calls[4][0]).toBe(
      "http://medusa:9000/store/customers/me"
    )
    expect(mockFetch.mock.calls[5][0]).toBe(
      "http://medusa:9000/store/customers/me/link-guest-orders"
    )
    expect(mockFetch.mock.calls[6][0]).toBe(
      "http://medusa:9000/store/carts/cart_123/customer"
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "_medusa_customer_token",
      refreshedToken,
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
  })

  it("creates a first-time Google customer when there is no same-email customer to claim", async () => {
    const initialToken = encodeJwtPayload({
      actor_id: "",
      user_metadata: { email: "ava@example.com" },
    })
    const refreshedToken = encodeJwtPayload({
      actor_id: "cus_123",
      user_metadata: { email: "ava@example.com" },
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: initialToken }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          message: "No existing customer is available to claim",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: { id: "cus_123", email: "ava@example.com" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: refreshedToken }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customer: { id: "cus_123" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ linked: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    const response = await completeGoogleAuth(
      createRequest(
        "https://store.staging.example.com/auth/google/callback?code=abc&state=xyz",
        {
          cookie: "google_oauth_redirect=/checkout; _medusa_cart_id=cart_123",
        }
      )
    )

    expect(response.headers.get("location")).toBe(
      "https://store.staging.example.com/checkout"
    )
    expect(mockFetch.mock.calls[0][0]).toBe(
      "http://medusa:9000/auth/customer/google/callback?code=abc&state=xyz"
    )
    expect(mockFetch.mock.calls[1][0]).toBe(
      "http://medusa:9000/store/customers/claim-account"
    )
    expect(mockFetch.mock.calls[2][0]).toBe(
      "http://medusa:9000/store/customers"
    )
    expect(mockFetch.mock.calls[2][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${initialToken}`,
          "x-publishable-api-key": "pk_test",
        }),
      })
    )
    expect(JSON.parse(String(mockFetch.mock.calls[2][1].body))).toEqual({
      email: "ava@example.com",
    })
    expect(mockFetch.mock.calls[3][0]).toBe(
      "http://medusa:9000/auth/token/refresh"
    )
    expect(mockFetch.mock.calls[4][0]).toBe(
      "http://medusa:9000/store/customers/me"
    )
    expect(mockFetch.mock.calls[5][0]).toBe(
      "http://medusa:9000/store/customers/me/link-guest-orders"
    )
    expect(mockFetch.mock.calls[5][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${refreshedToken}`,
          "x-publishable-api-key": "pk_test",
        }),
      })
    )
    expect(mockFetch.mock.calls[6][0]).toBe(
      "http://medusa:9000/store/carts/cart_123/customer"
    )
    expect(mockFetch.mock.calls[6][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${refreshedToken}`,
          "x-publishable-api-key": "pk_test",
        }),
      })
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "_medusa_customer_token",
      refreshedToken,
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "_medusa_authenticated",
      "true",
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
    expect(mockCookieDelete).toHaveBeenCalledWith("google_oauth_redirect")
  })

  it("redirects to sign-in with google_link_required when existing account needs linking", async () => {
    const initialToken = encodeJwtPayload({
      actor_id: "",
      user_metadata: { email: "existing@example.com" },
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: initialToken }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          message: "Google sign-in is not linked to this customer account",
          code: "google_link_required",
        }),
      })

    const response = await completeGoogleAuth(
      createRequest(
        "https://store.staging.example.com/auth/google/callback?code=abc"
      )
    )

    expect(response.headers.get("location")).toBe(
      "https://store.staging.example.com/sign-in?error=google_link_required"
    )
    expect(mockCookieSet).not.toHaveBeenCalledWith(
      "_medusa_customer_token",
      expect.any(String),
      expect.any(Object)
    )
  })

  it("links first-time Google auth to an existing same-email registered customer", async () => {
    const initialToken = encodeJwtPayload({
      actor_id: "",
      user_metadata: { email: "ava@example.com" },
    })
    const refreshedToken = encodeJwtPayload({
      actor_id: "cus_registered",
      user_metadata: { email: "ava@example.com" },
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: initialToken }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          claimed: false,
          linked: true,
          already_registered: true,
          customer: { id: "cus_registered", email: "ava@example.com" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: refreshedToken }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ linked: 2 }),
      })

    await completeGoogleAuth(
      createRequest(
        "https://store.staging.example.com/auth/google/callback?code=abc"
      )
    )

    expect(mockFetch.mock.calls[1][0]).toBe(
      "http://medusa:9000/store/customers/claim-account"
    )
    expect(mockFetch.mock.calls[2][0]).toBe(
      "http://medusa:9000/auth/token/refresh"
    )
    expect(mockFetch).not.toHaveBeenCalledWith(
      "http://medusa:9000/store/customers",
      expect.anything()
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "_medusa_customer_token",
      refreshedToken,
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
  })

  it("links Google from account settings without creating a new customer", async () => {
    const initialToken = encodeJwtPayload({
      actor_id: "",
      user_metadata: { email: "ava@example.com" },
    })
    const refreshedToken = encodeJwtPayload({
      actor_id: "cus_registered",
      user_metadata: { email: "ava@example.com" },
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: initialToken }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          claimed: false,
          linked: true,
          already_registered: true,
          customer: { id: "cus_registered", email: "ava@example.com" },
          reauth_token: "recent-google-reauth-token",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: refreshedToken }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ linked: 2 }),
      })

    const response = await completeGoogleAuth(
      createRequest(
        "https://store.staging.example.com/auth/google/callback?code=abc",
        {
          cookie:
            "google_oauth_mode=link; google_oauth_redirect=/account/settings; google_oauth_link_intent=oli_123; google_oauth_link_nonce=secure-link-nonce-value-with-32-chars",
        }
      )
    )

    expect(response.headers.get("location")).toBe(
      "https://store.staging.example.com/account/settings?google=connected"
    )
    expect(mockFetch.mock.calls[1][0]).toBe(
      "http://medusa:9000/store/customers/claim-account"
    )
    expect(JSON.parse(String(mockFetch.mock.calls[1][1].body))).toEqual({
      email: "ava@example.com",
      source: "google",
      link_intent_id: "oli_123",
      link_nonce: "secure-link-nonce-value-with-32-chars",
    })
    expect(mockFetch).not.toHaveBeenCalledWith(
      "http://medusa:9000/store/customers",
      expect.anything()
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "_medusa_customer_token",
      refreshedToken,
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
    expect(mockCookieDelete).toHaveBeenCalledWith("google_oauth_mode")
    expect(mockCookieSet).toHaveBeenCalledWith(
      "customer_account_reauth",
      "recent-google-reauth-token",
      expect.objectContaining({ httpOnly: true, maxAge: 300, path: "/" })
    )
  })

  it("does not create a customer when account-settings Google linking cannot find a same-email customer", async () => {
    const initialToken = encodeJwtPayload({
      actor_id: "",
      user_metadata: { email: "ava@example.com" },
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: initialToken }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          message: "No existing customer is available to claim",
        }),
      })

    const response = await completeGoogleAuth(
      createRequest(
        "https://store.staging.example.com/auth/google/callback?code=abc",
        {
          cookie:
            "google_oauth_mode=link; google_oauth_redirect=/account/settings; google_oauth_link_intent=oli_123; google_oauth_link_nonce=secure-link-nonce-value-with-32-chars",
        }
      )
    )

    expect(response.headers.get("location")).toBe(
      "https://store.staging.example.com/account/settings?google=connect_failed"
    )
    expect(mockFetch).not.toHaveBeenCalledWith(
      "http://medusa:9000/store/customers",
      expect.anything()
    )
    expect(mockCookieSet).not.toHaveBeenCalledWith(
      "_medusa_customer_token",
      expect.any(String),
      expect.any(Object)
    )
  })

  it("sets the callback token directly for an existing Google customer", async () => {
    const token = encodeJwtPayload({
      actor_id: "cus_existing",
      user_metadata: { email: "existing@example.com" },
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ linked: 1 }),
      })

    await completeGoogleAuth(
      createRequest(
        "https://store.staging.example.com/auth/google/callback?code=abc"
      )
    )

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[1][0]).toBe(
      "http://medusa:9000/store/customers/me/link-guest-orders"
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "_medusa_customer_token",
      token,
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
  })

  it("does not fail Google login when customer context linking fails", async () => {
    const token = encodeJwtPayload({
      actor_id: "cus_existing",
      user_metadata: { email: "existing@example.com" },
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token }),
      })
      .mockRejectedValueOnce(new Error("link unavailable"))

    const response = await completeGoogleAuth(
      createRequest(
        "https://store.staging.example.com/auth/google/callback?code=abc"
      )
    )

    expect(response.headers.get("location")).toBe(
      "https://store.staging.example.com/account"
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "_medusa_customer_token",
      token,
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
  })
})
