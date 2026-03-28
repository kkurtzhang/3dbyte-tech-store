import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import {
  getWebhookSecretFromHeaders,
  hasValidWebhookSecret,
  resolveStrapiRevalidationTargets,
} from "@/lib/strapi/revalidation"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const configuredSecret = process.env.STRAPI_WEBHOOK_REVALIDATION_SECRET

  if (!configuredSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing STRAPI_WEBHOOK_REVALIDATION_SECRET",
      },
      { status: 500 }
    )
  }

  const suppliedSecret = getWebhookSecretFromHeaders(request.headers)

  if (!hasValidWebhookSecret(suppliedSecret, configuredSecret)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 }
    )
  }

  let payload: Record<string, unknown> = {}

  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const { tags, paths } = resolveStrapiRevalidationTargets(payload)

  for (const tag of tags) {
    revalidateTag(tag, "max")
  }

  for (const path of paths) {
    revalidatePath(path)
  }

  return NextResponse.json({
    ok: true,
    tags,
    paths,
  })
}
