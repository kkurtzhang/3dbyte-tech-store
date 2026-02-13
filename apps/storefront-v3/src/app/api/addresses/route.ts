import { NextRequest, NextResponse } from "next/server"
import { sdk } from "@/lib/medusa/client"

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")
    const addressId = searchParams.get("id")

    const body = await request.json()

    if (action === "add") {
      const { customer } = await sdk.store.customer.createAddress(body)
      return NextResponse.json({ success: true, customer })
    }

    if (action === "update" && addressId) {
      const { customer } = await sdk.store.customer.updateAddress(addressId, body)
      return NextResponse.json({ success: true, customer })
    }

    if (action === "delete" && addressId) {
      await sdk.store.customer.deleteAddress(addressId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Address API error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
