const mockFetch = jest.fn()
const mockGetCustomerAuthHeaders = jest.fn()

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
  revalidatePath: jest.fn(),
}))

import { createProductFileDownloadAction } from "../product-files"

describe("product file actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCustomerAuthHeaders.mockResolvedValue({
      Authorization: "Bearer customer-token",
    })
  })

  it("requires authentication before creating product file downloads", async () => {
    mockGetCustomerAuthHeaders.mockResolvedValue(null)

    await expect(createProductFileDownloadAction("pef_1")).resolves.toEqual({
      success: false,
      requiresAuth: true,
      error: "Sign in to manage your product files.",
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("encodes the file id as a single backend route segment", async () => {
    mockFetch.mockResolvedValue({
      download: { url: "https://signed.example.com/file.zip" },
    })

    await expect(
      createProductFileDownloadAction("pef_1/../../admin")
    ).resolves.toEqual({
      success: true,
      url: "https://signed.example.com/file.zip",
    })

    expect(mockFetch).toHaveBeenCalledWith(
      "/store/customers/me/product-files/pef_1%2F..%2F..%2Fadmin/download",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer customer-token",
        },
      }
    )
  })
})
