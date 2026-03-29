import { timingSafeEqual } from "node:crypto"

interface StrapiWebhookPayload {
  model?: string
  uid?: string
  entry?: Record<string, unknown>
  tags?: string[]
  paths?: string[]
}

interface RevalidationTarget {
  tags: string[]
  paths: string[]
}

function normalizeKey(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase()
}

function getStringField(
  entry: Record<string, unknown> | undefined,
  keys: string[]
): string | null {
  if (!entry) {
    return null
  }

  for (const key of keys) {
    const value = entry[key]

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter((item) => item.trim().length > 0)))
}

export function getWebhookSecretFromHeaders(headers: Headers): string | null {
  const directSecret = headers.get("x-strapi-webhook-secret")?.trim()

  if (directSecret) {
    return directSecret
  }

  const authorization = headers.get("authorization")?.trim()

  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  const bearerToken = authorization.slice("Bearer ".length).trim()
  return bearerToken.length > 0 ? bearerToken : null
}

export function hasValidWebhookSecret(
  suppliedSecret: string | null | undefined,
  configuredSecret: string | null | undefined
): boolean {
  if (!suppliedSecret || !configuredSecret) {
    return false
  }

  const supplied = Buffer.from(suppliedSecret)
  const configured = Buffer.from(configuredSecret)

  if (supplied.length !== configured.length) {
    return false
  }

  return timingSafeEqual(supplied, configured)
}

export function resolveStrapiRevalidationTargets(
  payload: StrapiWebhookPayload
): RevalidationTarget {
  const normalizedModel = normalizeKey(payload.model || payload.uid)
  const tags = [...(payload.tags || [])]
  const paths = [...(payload.paths || [])]

  const contentPageTargets: Record<string, string> = {
    shipping: "/shipping",
    returns: "/returns",
    "privacy-policy": "/privacy-policy",
    "terms-and-condition": "/terms-and-conditions",
  }

  const contentPagePath = contentPageTargets[normalizedModel]

  if (contentPagePath) {
    tags.push(`content-page-${normalizedModel}`)
    paths.push(contentPagePath)
  }

  if (normalizedModel.includes("homepage")) {
    tags.push("homepage", "homepage-announcements")
    paths.push("/")
  }

  if (normalizedModel.includes("brand")) {
    tags.push("brand-descriptions")

    const handle = getStringField(payload.entry, ["brand_handle", "handle", "Handle"])

    if (handle) {
      tags.push(`brand-description-${handle}`)
    }
  }

  if (normalizedModel.includes("collection")) {
    tags.push("collections-content")

    const handle = getStringField(payload.entry, ["Handle", "handle"])

    if (handle) {
      tags.push(`collection-content-${handle}`)
    }
  }

  if (normalizedModel === "blogs" || normalizedModel.includes("blog-post")) {
    tags.push("blog")

    const slug = getStringField(payload.entry, ["Slug", "slug"])

    if (slug) {
      tags.push(`blog-${slug}`)
    }
  }

  if (normalizedModel.includes("blog-post-categor")) {
    tags.push("blog-categories")
  }

  return {
    tags: unique(tags),
    paths: unique(paths),
  }
}
