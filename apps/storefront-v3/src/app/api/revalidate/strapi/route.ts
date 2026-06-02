import { timingSafeEqual } from "node:crypto"

import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const homepageTags = ["homepage", "homepage-announcements"] as const
const allowedTags = new Set<string>(homepageTags)
const homepagePaths = ["/"] as const

type RevalidationPayload = {
  tags?: unknown
}

function safeEquals(value: string, expected: string) {
  const valueBuffer = Buffer.from(value)
  const expectedBuffer = Buffer.from(expected)

  return (
    valueBuffer.length === expectedBuffer.length &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  )
}

function getRequestSecret(headers: Headers) {
  const authorization = headers.get("authorization")?.trim()

  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim()
  }

  return (
    headers.get("x-strapi-webhook-secret") ||
    headers.get("x-webhook-secret") ||
    ""
  )
}

async function getPayload(request: Request): Promise<RevalidationPayload> {
  try {
    return (await request.json()) as RevalidationPayload
  } catch {
    return {}
  }
}

function getRequestedTags(payload: RevalidationPayload) {
  const requestedTags = Array.isArray(payload.tags) ? payload.tags : homepageTags
  const tags = requestedTags.filter(
    (tag): tag is string => typeof tag === "string" && allowedTags.has(tag)
  )

  return Array.from(new Set(tags))
}

export async function POST(request: Request) {
  const expectedSecret = process.env.STRAPI_WEBHOOK_REVALIDATION_SECRET

  if (!expectedSecret) {
    return NextResponse.json(
      { revalidated: false, error: "Revalidation is not configured." },
      { status: 503 }
    )
  }

  const requestSecret = getRequestSecret(request.headers)

  if (!requestSecret || !safeEquals(requestSecret, expectedSecret)) {
    return NextResponse.json(
      { revalidated: false, error: "Unauthorized." },
      { status: 401 }
    )
  }

  const payload = await getPayload(request)
  const tags = getRequestedTags(payload)

  if (tags.length === 0) {
    return NextResponse.json(
      { revalidated: false, error: "No supported cache tags requested." },
      { status: 400 }
    )
  }

  tags.forEach((tag) => revalidateTag(tag, "max"))
  homepagePaths.forEach((path) => revalidatePath(path))

  return NextResponse.json({
    revalidated: true,
    tags,
    paths: [...homepagePaths],
  })
}
