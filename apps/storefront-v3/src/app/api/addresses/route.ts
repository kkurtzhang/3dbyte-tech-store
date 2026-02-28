import { NextRequest, NextResponse } from "next/server"
import { sdk } from "@/lib/medusa/client"
import { z } from "zod"
import { checkRateLimit } from "@/lib/security/rate-limit"

const actionSchema = z.enum(["add", "update", "delete"])
const addressIdSchema = z.string().trim().min(1)
const addressPayloadSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  address_1: z.string().trim().min(1).max(200),
  address_2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  country_code: z.string().trim().length(2),
  postal_code: z.string().trim().min(1).max(20),
  phone: z.string().trim().max(30).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const rate = checkRateLimit(`addresses:${ip}`, 30, 60_000)
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rate.retryAfterMs / 1000).toString(),
          },
        }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const actionParam = searchParams.get("action")
    const addressId = searchParams.get("id")
    const actionParsed = actionSchema.safeParse(actionParam)
    if (!actionParsed.success) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }
    const action = actionParsed.data

    const rawBody = await request.json()

    if (action === "add") {
      const parsedBody = addressPayloadSchema.safeParse(rawBody)
      if (!parsedBody.success) {
        return NextResponse.json({ success: false, error: "Invalid address payload" }, { status: 400 })
      }
      const { customer } = await sdk.store.customer.createAddress(parsedBody.data)
      return NextResponse.json({ success: true, customer })
    }

    const parsedAddressId = addressIdSchema.safeParse(addressId)

    if (action === "update" && parsedAddressId.success) {
      const parsedBody = addressPayloadSchema.partial().safeParse(rawBody)
      if (!parsedBody.success) {
        return NextResponse.json({ success: false, error: "Invalid address payload" }, { status: 400 })
      }
      const { customer } = await sdk.store.customer.updateAddress(parsedAddressId.data, parsedBody.data)
      return NextResponse.json({ success: true, customer })
    }

    if (action === "delete" && parsedAddressId.success) {
      await sdk.store.customer.deleteAddress(parsedAddressId.data)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Address API error:", error)
    return NextResponse.json({ success: false, error: "Failed to process request" }, { status: 500 })
  }
}
