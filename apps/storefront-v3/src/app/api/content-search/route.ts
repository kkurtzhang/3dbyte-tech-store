import { NextRequest, NextResponse } from "next/server"
import { searchContent } from "@/lib/search/content"
import type { ContentSearchScope } from "@/lib/search/content"

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 12

function parseScope(value: string | null): ContentSearchScope | null {
  if (value === "help" || value === "guides") {
    return value
  }
  return null
}

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || ""
  if (!q) {
    return NextResponse.json({ results: [] })
  }

  const scope = parseScope(request.nextUrl.searchParams.get("scope") || "help")
  if (!scope) {
    return NextResponse.json(
      { error: "Invalid scope. Supported values: help, guides." },
      { status: 400 }
    )
  }

  const limit = parseLimit(request.nextUrl.searchParams.get("limit"))

  try {
    const results = await searchContent(q, scope, limit)
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json(
      { error: "Failed to search content." },
      { status: 500 }
    )
  }
}
