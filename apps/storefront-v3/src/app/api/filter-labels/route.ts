import { NextResponse } from "next/server"
import { getFacetLabels } from "@/lib/filters/facet-labels"

export async function GET() {
  try {
    const labels = await getFacetLabels()
    return NextResponse.json(labels)
  } catch {
    return NextResponse.json(
      { error: "Failed to load facet labels." },
      { status: 500 }
    )
  }
}
