import { resolveMedusaBaseUrl } from "../base-url"

describe("resolveMedusaBaseUrl", () => {
  it("prefers the internal server URL for server-side requests", () => {
    expect(
      resolveMedusaBaseUrl({
        isServer: true,
        env: {
          MEDUSA_SERVER_BACKEND_URL: "http://medusa:9000",
          MEDUSA_BACKEND_URL: "https://api.staging.example.com",
          NEXT_PUBLIC_MEDUSA_BACKEND_URL: "https://api.example.com",
        },
      })
    ).toBe("http://medusa:9000")
  })

  it("keeps the public URL for browser requests", () => {
    expect(
      resolveMedusaBaseUrl({
        isServer: false,
        env: {
          MEDUSA_SERVER_BACKEND_URL: "http://medusa:9000",
          MEDUSA_BACKEND_URL: "https://api.staging.example.com",
          NEXT_PUBLIC_MEDUSA_BACKEND_URL: "https://api.example.com",
        },
      })
    ).toBe("https://api.example.com")
  })
})
