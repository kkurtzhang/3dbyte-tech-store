const mockFetch = jest.fn()
const mockGetCustomerAuthHeaders = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock("@/lib/medusa/client", () => ({
  sdk: {
    client: {
      fetch: (...args: unknown[]) => mockFetch(...args),
    },
  },
}))

jest.mock("@/app/actions/auth", () => ({
  getCustomerAuthHeaders: () => mockGetCustomerAuthHeaders(),
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

import {
  addWaitlistItemAction,
  clearWaitlistAction,
  getWaitlistAction,
  removeWaitlistItemAction,
} from "../waitlist"

describe("waitlist actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCustomerAuthHeaders.mockResolvedValue({
      Authorization: "Bearer customer-token",
    })
  })

  it("requires an authenticated customer before reading waitlist data", async () => {
    mockGetCustomerAuthHeaders.mockResolvedValue(null)

    await expect(getWaitlistAction()).resolves.toEqual({
      success: false,
      requiresAuth: true,
      error: "Sign in to manage your waitlist.",
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("reads server waitlist rows", async () => {
    mockFetch.mockResolvedValue({
      customer_email: "ava@example.com",
      waitlist: [
        {
          id: "wait_1",
          product_id: "prod_1",
          product_variant_id: "variant_1",
          product_handle: "test-product",
          product_title: "Test Product",
          variant_title: "Black - 180",
          customer_email: "ava@example.com",
          created_at: "2026-05-12T00:00:00.000Z",
          notified: false,
        },
      ],
    })

    await expect(getWaitlistAction()).resolves.toEqual({
      success: true,
      customerEmail: "ava@example.com",
      waitlist: [
        expect.objectContaining({
          id: "prod_1",
          waitlistId: "wait_1",
          productId: "prod_1",
          productHandle: "test-product",
          productTitle: "Test Product",
          variantId: "variant_1",
          variantTitle: "Black - 180",
          email: "ava@example.com",
        }),
      ],
    })
    expect(mockFetch).toHaveBeenCalledWith("/store/waitlist", {
      method: "GET",
      headers: {
        Authorization: "Bearer customer-token",
      },
    })
  })

  it("adds waitlist items through the authenticated store API", async () => {
    mockFetch.mockResolvedValue({
      waitlist: {
        id: "wait_1",
        product_id: "prod_1",
        product_variant_id: "variant_1",
      },
    })

    await expect(
      addWaitlistItemAction({
        productId: "prod_1",
        productHandle: "test-product",
        productTitle: "Test Product",
        variantId: "variant_1",
        variantTitle: "Black - 180",
      })
    ).resolves.toEqual({
      success: true,
      item: expect.objectContaining({
        id: "prod_1",
        waitlistId: "wait_1",
      }),
    })
    expect(mockFetch).toHaveBeenCalledWith("/store/waitlist", {
      method: "POST",
      body: {
        product_id: "prod_1",
        product_variant_id: "variant_1",
        product_handle: "test-product",
        product_title: "Test Product",
        variant_title: "Black - 180",
      },
      headers: {
        Authorization: "Bearer customer-token",
      },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/waitlist")
  })

  it("adds guest waitlist items with an email address", async () => {
    mockGetCustomerAuthHeaders.mockResolvedValue(null)
    mockFetch.mockResolvedValue({
      waitlist: {
        id: "wait_guest",
        customer_email: "guest@example.com",
        product_id: "prod_1",
        product_variant_id: "variant_1",
      },
    })

    await expect(
      addWaitlistItemAction({
        productId: "prod_1",
        productHandle: "test-product",
        productTitle: "Test Product",
        variantId: "variant_1",
        variantTitle: "Black - 180",
        email: "guest@example.com",
      })
    ).resolves.toEqual({
      success: true,
      item: expect.objectContaining({
        waitlistId: "wait_guest",
        email: "guest@example.com",
      }),
    })
    expect(mockFetch).toHaveBeenCalledWith("/store/waitlist", {
      method: "POST",
      body: {
        email: "guest@example.com",
        product_id: "prod_1",
        product_variant_id: "variant_1",
        product_handle: "test-product",
        product_title: "Test Product",
        variant_title: "Black - 180",
      },
      headers: undefined,
    })
  })

  it("removes waitlist rows by server waitlist id", async () => {
    mockFetch.mockResolvedValue({})

    await expect(removeWaitlistItemAction("wait_1")).resolves.toEqual({
      success: true,
    })
    expect(mockFetch).toHaveBeenCalledWith("/store/waitlist/wait_1", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer customer-token",
      },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/waitlist")
  })

  it("clears waitlist rows through the authenticated store API", async () => {
    mockFetch.mockResolvedValue({})

    await expect(clearWaitlistAction()).resolves.toEqual({
      success: true,
    })
    expect(mockFetch).toHaveBeenCalledWith("/store/waitlist", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer customer-token",
      },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/waitlist")
  })
})
