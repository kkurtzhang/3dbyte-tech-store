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

  it("derives the staging API URL for browser requests when the public env is missing", () => {
    const options = {
      isServer: false,
      env: {},
      location: {
        protocol: "https:",
        hostname: "store.staging.3dbytetech.com.au",
      },
    }

    expect(resolveMedusaBaseUrl(options)).toBe(
      "https://api.staging.3dbytetech.com.au"
    )
  })

  it("keeps localhost for local browser requests when the public env is missing", () => {
    const options = {
      isServer: false,
      env: {},
      location: {
        protocol: "http:",
        hostname: "localhost",
      },
    }

    expect(resolveMedusaBaseUrl(options)).toBe("http://localhost:9000")
  })

  it("does not infer API URLs for unknown hosted storefront domains", () => {
    const options = {
      isServer: false,
      env: {},
      location: {
        protocol: "https:",
        hostname: "store.example.com",
      },
    }

    expect(resolveMedusaBaseUrl(options)).toBe("http://localhost:9000")
  })
})
