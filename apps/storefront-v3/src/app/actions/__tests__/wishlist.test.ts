const mockFetch = jest.fn()
const mockListProducts = jest.fn()
const mockGetCustomerAuthHeaders = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock("@/lib/medusa/client", () => ({
  sdk: {
    client: {
      fetch: (...args: unknown[]) => mockFetch(...args),
    },
    store: {
      product: {
        list: (...args: unknown[]) => mockListProducts(...args),
      },
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
  addWishlistItemAction,
  clearWishlistAction,
  getWishlistAction,
  removeWishlistItemAction,
} from "../wishlist"

describe("wishlist actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCustomerAuthHeaders.mockResolvedValue({
      Authorization: "Bearer customer-token",
    })
  })

  it("requires an authenticated customer before reading wishlist data", async () => {
    mockGetCustomerAuthHeaders.mockResolvedValue(null)

    await expect(getWishlistAction()).resolves.toEqual({
      success: false,
      requiresAuth: true,
      error: "Sign in to manage your wishlist.",
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("reads server wishlist rows and resolves product display data", async () => {
    mockFetch.mockResolvedValue({
      wishlist: [
        {
          id: "wish_1",
          product_id: "prod_1",
          product_variant_id: "variant_1",
        },
      ],
    })
    mockListProducts.mockResolvedValue({
      products: [
        {
          id: "prod_1",
          handle: "test-product",
          title: "Test Product",
          thumbnail: "/test.jpg",
          variants: [
            {
              id: "variant_1",
              calculated_price: {
                calculated_amount: 42,
                currency_code: "aud",
              },
            },
          ],
        },
      ],
    })

    await expect(getWishlistAction()).resolves.toEqual({
      success: true,
      wishlist: [
        expect.objectContaining({
          id: "prod_1",
          wishlistId: "wish_1",
          handle: "test-product",
          title: "Test Product",
          price: {
            amount: 42,
            currency_code: "AUD",
          },
          variantId: "variant_1",
        }),
      ],
    })
    expect(mockListProducts).toHaveBeenCalledWith({
      id: ["prod_1"],
      limit: 1,
      fields: "*variants,*variants.prices,*variants.calculated_price",
    })
  })

  it("adds wishlist items through the authenticated store API", async () => {
    mockFetch.mockResolvedValue({
      wishlist: {
        id: "wish_1",
        product_id: "prod_1",
        product_variant_id: "variant_1",
      },
    })

    await expect(
      addWishlistItemAction({
        id: "prod_1",
        handle: "test-product",
        title: "Test Product",
        thumbnail: "/test.jpg",
        price: {
          amount: 42,
          currency_code: "AUD",
        },
        variantId: "variant_1",
      })
    ).resolves.toEqual({
      success: true,
      item: expect.objectContaining({
        id: "prod_1",
        wishlistId: "wish_1",
      }),
    })
    expect(mockFetch).toHaveBeenCalledWith("/store/wishlist", {
      method: "POST",
      body: {
        product_id: "prod_1",
        product_variant_id: "variant_1",
      },
      headers: {
        Authorization: "Bearer customer-token",
      },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/wishlist")
  })

  it("removes wishlist rows by server wishlist id", async () => {
    mockFetch.mockResolvedValue({ id: "wish_1" })

    await expect(removeWishlistItemAction("wish_1")).resolves.toEqual({
      success: true,
    })
    expect(mockFetch).toHaveBeenCalledWith("/store/wishlist/wish_1", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer customer-token",
      },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/wishlist")
  })

  it("clears wishlist rows through the authenticated store API", async () => {
    mockFetch.mockResolvedValue({})

    await expect(clearWishlistAction(["wish_1", "wish_2"])).resolves.toEqual({
      success: true,
    })
    expect(mockFetch).toHaveBeenNthCalledWith(1, "/store/wishlist/wish_1", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer customer-token",
      },
    })
    expect(mockFetch).toHaveBeenNthCalledWith(2, "/store/wishlist/wish_2", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer customer-token",
      },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/wishlist")
  })
})
