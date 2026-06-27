import { NextResponse } from "next/server"

import { getReleaseSha } from "@/lib/release-identity"

export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json({
    releaseSha: getReleaseSha(),
    service: "storefront",
    status: "ok",
  })
}
