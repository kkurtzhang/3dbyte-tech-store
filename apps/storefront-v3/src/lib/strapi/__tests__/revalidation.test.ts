import {
  getWebhookSecretFromHeaders,
  hasValidWebhookSecret,
  resolveStrapiRevalidationTargets,
} from "../revalidation"

describe("strapi revalidation helpers", () => {
  it("maps homepage payloads to homepage tags and root path", () => {
    expect(
      resolveStrapiRevalidationTargets({
        model: "homepage",
      })
    ).toEqual({
      tags: ["homepage", "homepage-announcements"],
      paths: ["/"],
    })
  })

  it("adds precise tags when brand and collection handles are present", () => {
    expect(
      resolveStrapiRevalidationTargets({
        model: "brand-description",
        entry: {
          brand_handle: "polymaker",
        },
      })
    ).toEqual({
      tags: ["brand-descriptions", "brand-description-polymaker"],
      paths: [],
    })

    expect(
      resolveStrapiRevalidationTargets({
        model: "collection",
        entry: {
          Handle: "premium-filaments",
        },
      })
    ).toEqual({
      tags: ["collections-content", "collection-content-premium-filaments"],
      paths: [],
    })
  })

  it("deduplicates inferred and manually supplied targets", () => {
    expect(
      resolveStrapiRevalidationTargets({
        model: "homepage",
        tags: ["homepage"],
        paths: ["/"],
      })
    ).toEqual({
      tags: ["homepage", "homepage-announcements"],
      paths: ["/"],
    })
  })

  it("extracts the webhook secret from a dedicated header or bearer token", () => {
    expect(
      getWebhookSecretFromHeaders(
        new Headers({
          "x-strapi-webhook-secret": "test-secret",
        })
      )
    ).toBe("test-secret")

    expect(
      getWebhookSecretFromHeaders(
        new Headers({
          authorization: "Bearer another-secret",
        })
      )
    ).toBe("another-secret")
  })

  it("validates webhook secrets with a constant-time comparison", () => {
    expect(hasValidWebhookSecret("test-secret", "test-secret")).toBe(true)
    expect(hasValidWebhookSecret("test-secret", "wrong-secret")).toBe(false)
    expect(hasValidWebhookSecret(null, "test-secret")).toBe(false)
  })
})
