const mockAuthRegister = jest.fn()
const mockAuthLogin = jest.fn()
const mockAuthResetPassword = jest.fn()
const mockAuthUpdateProvider = jest.fn()
const mockClientFetch = jest.fn()
const mockCustomerCreate = jest.fn()
const mockCustomerRetrieve = jest.fn()
const mockCookieGet = jest.fn()
const mockCookieSet = jest.fn()
const mockCookieDelete = jest.fn()
const mockRevalidatePath = jest.fn()
const mockConsoleError = jest
  .spyOn(console, "error")
  .mockImplementation(() => undefined)

jest.mock("@/lib/medusa/client", () => ({
  sdk: {
    auth: {
      register: (...args: unknown[]) => mockAuthRegister(...args),
      login: (...args: unknown[]) => mockAuthLogin(...args),
      resetPassword: (...args: unknown[]) => mockAuthResetPassword(...args),
      updateProvider: (...args: unknown[]) => mockAuthUpdateProvider(...args),
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

import {
  deleteAccountAction,
  getLoginMethodsAction,
  getSessionAction,
  loginAction,
  registerAction,
  requestPasswordResetAction,
  resetPasswordAction,
} from "../auth"

describe("auth actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockClientFetch.mockReset()
    mockAuthRegister.mockResolvedValue("registration-token")
    mockAuthResetPassword.mockResolvedValue(undefined)
    mockAuthUpdateProvider.mockResolvedValue(undefined)
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

  afterAll(() => {
    mockConsoleError.mockRestore()
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

  it("uses the registration token to create a brand-new customer profile and sends verification", async () => {
    const noClaimableCustomer = new Error("No existing customer is available to claim")
    Object.assign(noClaimableCustomer, { status: 404 })
    mockClientFetch
      .mockRejectedValueOnce(noClaimableCustomer)
      .mockResolvedValueOnce({})

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

  it("claims an existing same-email guest customer instead of creating a duplicate profile", async () => {
    mockClientFetch
      .mockResolvedValueOnce({
        claimed: true,
        linked: true,
        customer: {
          id: "cus_guest",
          email: "guest@example.com",
        },
      })
      .mockResolvedValueOnce({ token: "claimed-token" })
      .mockResolvedValueOnce({})

    await expect(
      registerAction("guest@example.com", "Password123!", "Guest", "Customer")
    ).resolves.toEqual({
      success: true,
      requiresEmailVerification: true,
    })

    expect(mockClientFetch).toHaveBeenNthCalledWith(
      1,
      "/store/customers/claim-account",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer registration-token",
        },
        body: {
          email: "guest@example.com",
          first_name: "Guest",
          last_name: "Customer",
          source: "emailpass",
        },
      })
    )
    expect(mockClientFetch).toHaveBeenNthCalledWith(
      2,
      "/auth/token/refresh",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer registration-token",
        },
      })
    )
    expect(mockClientFetch).toHaveBeenNthCalledWith(
      3,
      "/store/customers/email-verifications",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer claimed-token",
        },
      })
    )
    expect(mockCustomerCreate).not.toHaveBeenCalled()
    expect(mockCookieSet).not.toHaveBeenCalled()
  })

  it("reuses an existing auth identity without a customer account before creating the customer profile", async () => {
    const existingIdentityError = new Error("Identity with email already exists")
    Object.assign(existingIdentityError, { statusText: "Unauthorized" })
    const noClaimableCustomer = new Error("No existing customer is available to claim")
    Object.assign(noClaimableCustomer, { status: 404 })
    mockAuthRegister.mockRejectedValueOnce(existingIdentityError)
    mockClientFetch
      .mockRejectedValueOnce(noClaimableCustomer)
      .mockResolvedValueOnce({})

    await expect(
      registerAction("guest@example.com", "Password123!", "Guest", "Customer")
    ).resolves.toEqual({
      success: true,
      requiresEmailVerification: true,
    })

    expect(mockAuthLogin).toHaveBeenCalledWith("customer", "emailpass", {
      email: "guest@example.com",
      password: "Password123!",
    })
    expect(mockClientFetch).toHaveBeenNthCalledWith(
      1,
      "/store/customers/claim-account",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer login-token",
        },
        body: {
          email: "guest@example.com",
          first_name: "Guest",
          last_name: "Customer",
          source: "emailpass",
        },
      })
    )
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      {
        email: "guest@example.com",
        first_name: "Guest",
        last_name: "Customer",
      },
      {},
      {
        Authorization: "Bearer login-token",
      }
    )
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

  it("directs existing registered customers to sign in instead of creating another account", async () => {
    const existingIdentityError = new Error("Identity with email already exists")
    Object.assign(existingIdentityError, { statusText: "Unauthorized" })
    mockAuthRegister.mockRejectedValueOnce(existingIdentityError)
    mockClientFetch.mockResolvedValueOnce({
      already_registered: true,
      customer: {
        id: "cus_registered",
        email: "registered@example.com",
      },
    })

    await expect(
      registerAction("registered@example.com", "Password123!", "Ava", "Customer")
    ).resolves.toEqual({
      success: false,
      error: "An account already exists for this email. Please sign in instead.",
    })

    expect(mockCustomerCreate).not.toHaveBeenCalled()
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

  it("retrieves linked customer login methods from the backend", async () => {
    mockClientFetch.mockResolvedValueOnce({
      login_methods: {
        emailpass: true,
        google: true,
        providers: ["emailpass", "google"],
      },
    })

    await expect(getLoginMethodsAction()).resolves.toEqual({
      success: true,
      loginMethods: {
        emailpass: true,
        google: true,
        providers: ["emailpass", "google"],
      },
    })

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me/login-methods",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer stored-token",
        },
      })
    )
  })

  it("deletes the current customer account through the backend and clears session cookies", async () => {
    await expect(deleteAccountAction()).resolves.toEqual({ success: true })

    expect(mockClientFetch).toHaveBeenCalledWith(
      "/store/customers/me",
      expect.objectContaining({
        method: "DELETE",
        headers: {
          Authorization: "Bearer stored-token",
        },
      })
    )
    expect(mockCookieDelete).toHaveBeenCalledWith("_medusa_authenticated")
    expect(mockCookieDelete).toHaveBeenCalledWith("_medusa_customer_token")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("requests a customer password reset without exposing account existence", async () => {
    await expect(
      requestPasswordResetAction(" Customer@Example.COM ")
    ).resolves.toEqual({
      success: true,
    })

    expect(mockAuthResetPassword).toHaveBeenCalledWith(
      "customer",
      "emailpass",
      {
        identifier: "customer@example.com",
      }
    )
  })

  it("rejects invalid password reset request emails before calling Medusa", async () => {
    await expect(requestPasswordResetAction("not-an-email")).resolves.toEqual({
      success: false,
      error: "Please enter a valid email address.",
    })

    expect(mockAuthResetPassword).not.toHaveBeenCalled()
  })

  it("keeps password reset request failures account-enumeration safe", async () => {
    mockAuthResetPassword.mockRejectedValueOnce(new Error("not found"))

    await expect(
      requestPasswordResetAction("customer@example.com")
    ).resolves.toEqual({
      success: true,
    })

    expect(mockAuthResetPassword).toHaveBeenCalledWith(
      "customer",
      "emailpass",
      {
        identifier: "customer@example.com",
      }
    )
  })

  it("updates the customer password with the reset token and normalized email", async () => {
    await expect(
      resetPasswordAction(" Customer@Example.COM ", "reset-token", "Password123!")
    ).resolves.toEqual({
      success: true,
    })

    expect(mockAuthUpdateProvider).toHaveBeenCalledWith(
      "customer",
      "emailpass",
      {
        email: "customer@example.com",
        password: "Password123!",
      },
      "reset-token"
    )
  })

  it("rejects weak reset passwords before calling Medusa", async () => {
    await expect(
      resetPasswordAction("customer@example.com", "reset-token", "password")
    ).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("uppercase"),
    })

    expect(mockAuthUpdateProvider).not.toHaveBeenCalled()
  })
})
