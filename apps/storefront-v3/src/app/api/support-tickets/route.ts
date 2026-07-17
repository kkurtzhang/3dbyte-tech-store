import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"

const supportTicketSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(160),
  category: z
    .enum([
      "general",
      "product_support",
      "order_status",
      "shipping",
      "returns_refunds",
      "account",
      "wholesale",
      "other",
    ])
    .default("general"),
  message: z.string().trim().min(1).max(4_000),
  source: z.literal("contact_form").default("contact_form"),
  order_reference: z.string().trim().max(80).optional(),
  product_handle: z.string().trim().max(160).optional(),
})

const readJson = async (response: Response) => {
  try {
    return await response.json()
  } catch {
    return { message: "Unable to create support ticket" }
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers)
    const rate = await checkRateLimit(`support-ticket:${ip}`, 5, 60_000)

    if (!rate.allowed) {
      return NextResponse.json(
        { message: "Too many support requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rate.retryAfterMs / 1000).toString(),
          },
        },
      )
    }

    const parsed = supportTicketSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please complete the support request fields." },
        { status: 400 },
      )
    }

    const backendUrl = resolveMedusaBaseUrl({ isServer: true })
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    const response = await fetch(`${backendUrl}/store/support-tickets`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(publishableKey
          ? { "x-publishable-api-key": publishableKey }
          : {}),
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(parsed.data),
    })
    const data = await readJson(response)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Support ticket submission error:", error)
    return NextResponse.json(
      { message: "Unable to create support ticket" },
      { status: 500 },
    )
  }
}
