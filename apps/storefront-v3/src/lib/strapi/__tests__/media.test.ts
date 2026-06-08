import { resolveStrapiMediaUrl } from "../media"

describe("resolveStrapiMediaUrl", () => {
  const originalStrapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL

  afterEach(() => {
    if (originalStrapiUrl) {
      process.env.NEXT_PUBLIC_STRAPI_URL = originalStrapiUrl
    } else {
      delete process.env.NEXT_PUBLIC_STRAPI_URL
    }
  })

  it("resolves relative upload URLs against the Strapi origin", () => {
    process.env.NEXT_PUBLIC_STRAPI_URL = "https://cms.example.com"

    expect(resolveStrapiMediaUrl("/uploads/hero.png")).toBe(
      "https://cms.example.com/uploads/hero.png"
    )
  })

  it("does not append media paths under an accidental /api suffix", () => {
    process.env.NEXT_PUBLIC_STRAPI_URL = "https://cms.example.com/api"

    expect(resolveStrapiMediaUrl("/uploads/logo.png")).toBe(
      "https://cms.example.com/uploads/logo.png"
    )
  })
})
