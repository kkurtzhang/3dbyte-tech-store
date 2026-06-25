import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json({
    releaseSha: process.env.STOREFRONT_RELEASE_SHA?.trim() || "unknown",
    service: "storefront",
    status: "ok",
  })
}
