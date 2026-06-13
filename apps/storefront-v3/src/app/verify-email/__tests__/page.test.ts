const mockFetch = jest.fn()
const mockRedirect = jest.fn((url: string) => {
  throw new Error(`redirect:${url}`)
})
const mockRevalidatePath = jest.fn()

const mockCookieStore = {
  get: jest.fn(),
}

jest.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}))

jest.mock("next/headers", () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

jest.mock("@/lib/medusa/base-url", () => ({
  resolveMedusaBaseUrl: () => "https://api.example.com",
}))

import VerifyEmailPage from "../page"

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = mockFetch as unknown as typeof fetch
    mockCookieStore.get.mockReturnValue(undefined)
  })

  it("redirects to the verified sign-in state when the backend confirms the token", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ verified: true }),
      ok: true,
      status: 200,
    })

    await expect(
      VerifyEmailPage({
        searchParams: Promise.resolve({ token: "valid-token" }),
      }),
    ).rejects.toThrow("redirect:/sign-in?verified=1")

    expect(String(mockFetch.mock.calls[0][0])).toBe(
      "https://api.example.com/store/customers/email-verifications?token=valid-token&response=json",
    )
    expect(mockFetch.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          accept: "application/json",
        }),
      }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/account", "layout")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/account/settings")
  })

  it("redirects to the unverified sign-in state when the backend rejects the token", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ verified: false }),
      ok: true,
      status: 200,
    })

    await expect(
      VerifyEmailPage({
        searchParams: Promise.resolve({ token: "bad-token" }),
      }),
    ).rejects.toThrow("redirect:/sign-in?verified=0")
  })

  it("redirects logged-in users to /account instead of /sign-in", async () => {
    mockCookieStore.get.mockReturnValue({ value: "some-token" })
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ verified: true }),
      ok: true,
      status: 200,
    })

    await expect(
      VerifyEmailPage({
        searchParams: Promise.resolve({ token: "valid-token" }),
      }),
    ).rejects.toThrow("redirect:/account?verified=1")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/account", "layout")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/account/settings")
  })

  it("redirects logged-in users back to the verification-required page when verification fails", async () => {
    mockCookieStore.get.mockReturnValue({ value: "some-token" })
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ verified: false }),
      ok: true,
      status: 200,
    })

    await expect(
      VerifyEmailPage({
        searchParams: Promise.resolve({ token: "bad-token" }),
      }),
    ).rejects.toThrow("redirect:/verify-required?verified=0")
  })

  it("honors backend account-settings redirects for verified email-change links", async () => {
    mockCookieStore.get.mockReturnValue({ value: "some-token" })
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        verified: true,
        redirect_to: "https://store.example.com/account/settings?email=changed",
      }),
      ok: true,
      status: 200,
    })

    await expect(
      VerifyEmailPage({
        searchParams: Promise.resolve({ token: "email-change-token" }),
      }),
    ).rejects.toThrow("redirect:/account/settings?email=changed")
  })
})
