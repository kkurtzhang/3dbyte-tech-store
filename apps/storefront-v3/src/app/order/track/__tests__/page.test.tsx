const mockPermanentRedirect = jest.fn(() => {
  throw new Error("NEXT_REDIRECT")
})

jest.mock("next/navigation", () => ({
  permanentRedirect: (...args: unknown[]) => mockPermanentRedirect(...args),
}))

import TrackOrderPage from "../page"

describe("legacy order tracking route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("redirects to the canonical tracker while preserving the email reference", async () => {
    await expect(
      TrackOrderPage({
        searchParams: Promise.resolve({ reference: "3DBO-AKK7-5KYYDE" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT")

    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      "/track-order?reference=3DBO-AKK7-5KYYDE"
    )
  })

  it("redirects empty legacy links to the canonical tracker", async () => {
    await expect(
      TrackOrderPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow("NEXT_REDIRECT")

    expect(mockPermanentRedirect).toHaveBeenCalledWith("/track-order")
  })
})
