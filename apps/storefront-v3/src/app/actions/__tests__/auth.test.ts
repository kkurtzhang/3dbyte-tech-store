const mockAuthRegister = jest.fn()
const mockAuthLogin = jest.fn()
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
      customer: { id: "cus_123", email: "test@example.com" },
    })
    mockCookieGet.mockReturnValue({ value: "stored-token" })
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
  })

  it("uses the registration token to create the customer profile", async () => {
    await expect(
      registerAction("test@example.com", "Password123!", "E2E", "Customer")
    ).resolves.toEqual({
      success: true,
      user: { id: "cus_123", email: "test@example.com" },
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
