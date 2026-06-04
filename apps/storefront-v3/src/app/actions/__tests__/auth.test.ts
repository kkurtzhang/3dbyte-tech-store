const mockAuthRegister = jest.fn()
const mockAuthLogin = jest.fn()
const mockClientFetch = jest.fn()
const mockCustomerCreate = jest.fn()
const mockCustomerRetrieve = jest.fn()
const mockCookieGet = jest.fn()
const mockCookieSet = jest.fn()
const mockCookieDelete = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock("@/lib/medusa/client", () => ({
  sdk: {
    auth: {
      register: (...args: unknown[]) => mockAuthRegister(...args),
      login: (...args: unknown[]) => mockAuthLogin(...args),
    },
    client: {
      fetch: (...args: unknown[]) => mockClientFetch(...args),
    },
    store: {
      customer: {
        create: (...args: unknown[]) => mockCustomerCreate(...args),
        retrieve: (...args: unknown[]) => mockCustomerRetrieve(...args),
      },
    },
  },
}))

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    get: mockCookieGet,
    set: mockCookieSet,
    delete: mockCookieDelete,
  })),
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}))

import { getSessionAction, loginAction, registerAction } from "../auth"

describe("auth actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthRegister.mockResolvedValue("registration-token")
    mockCustomerCreate.mockResolvedValue({
      customer: { id: "cus_123", email: "test@example.com" },
    })
    mockAuthLogin.mockResolvedValue("login-token")
    mockCustomerRetrieve.mockResolvedValue({
      customer: {
        id: "cus_123",
        email: "test@example.com",
        metadata: {
          email_verified_at: "2026-06-04T00:00:00.000Z",
        },
      },
    })
    mockClientFetch.mockResolvedValue({})
    mockCookieGet.mockImplementation((name: string) => {
      if (name === "_medusa_customer_token") {
        return { value: "stored-token" }
      }
      if (name === "_medusa_cart_id") {
        return { value: "cart_123" }
      }
      return undefined
    })
  })

  it("uses the login token to retrieve and persist the customer session", async () => {
    await expect(loginAction("test@example.com", "Password123!")).resolves.toEqual({
      success: true,
      user: { id: "cus_123", email: "test@example.com" },
    })

    expect(mockCustomerRetrieve).toHaveBeenCalledWith(
      {},
      {
        Authorization: "Bearer login-token",
      }
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      "_medusa_customer_token",
      "login-token",
      expect.objectContaining({ httpOnly: true })
    )
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me/link-guest-orders",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer login-token",
        },
      })
    )
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/carts/cart_123/customer",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer login-token",
        },
      })
    )
  })

  it("uses the registration token to create the customer profile and sends verification", async () => {
    await expect(
      registerAction("test@example.com", "Password123!", "E2E", "Customer")
    ).resolves.toEqual({
      success: true,
      requiresEmailVerification: true,
    })

    expect(mockCustomerCreate).toHaveBeenCalledWith(
      {
        email: "test@example.com",
        first_name: "E2E",
        last_name: "Customer",
      },
      {},
      {
        Authorization: "Bearer registration-token",
      }
    )
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/email-verifications",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer registration-token",
        },
      })
    )
    expect(mockAuthLogin).not.toHaveBeenCalled()
    expect(mockCookieSet).not.toHaveBeenCalled()
  })

  it("rejects weak registration passwords before calling Medusa", async () => {
    await expect(
      registerAction("test@example.com", "password", "E2E", "Customer")
    ).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("uppercase"),
    })

    expect(mockAuthRegister).not.toHaveBeenCalled()
    expect(mockCustomerCreate).not.toHaveBeenCalled()
  })

  it("refuses login for customers who have not confirmed their email", async () => {
    mockCustomerRetrieve.mockResolvedValueOnce({
      customer: {
        id: "cus_pending",
        email: "pending@example.com",
        metadata: {
          email_verification_status: "pending",
        },
      },
    })

    await expect(loginAction("pending@example.com", "Password123!")).resolves.toEqual({
      success: false,
      error: "Please confirm your email before signing in. We sent a new confirmation link.",
      requiresEmailVerification: true,
    })

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/email-verifications",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer login-token",
        },
      })
    )
    expect(mockCookieSet).not.toHaveBeenCalled()
  })

  it("retrieves the current session from the stored customer token", async () => {
    await expect(getSessionAction()).resolves.toEqual({
      success: true,
      user: { id: "cus_123", email: "test@example.com" },
    })

    expect(mockCustomerRetrieve).toHaveBeenCalledWith(
      {},
      {
        Authorization: "Bearer stored-token",
      }
    )
  })
})
