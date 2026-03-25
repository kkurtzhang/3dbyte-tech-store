import { NextResponse } from "next/server"
import { getProductByHandle } from "@/lib/medusa/products"

interface RouteContext {
  params: Promise<{
    handle: string
  }>
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    )
  }

  return NextResponse.json({ product })
}
