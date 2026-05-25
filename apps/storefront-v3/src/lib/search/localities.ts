import type { MeilisearchLocalityDocument } from "@3dbyte-tech-store/shared-types"
import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url"

const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

export interface LocalitySearchFilters {
  country?: "AU" | "NZ"
  state?: "ACT" | "NSW" | "NT" | "QLD" | "SA" | "TAS" | "VIC" | "WA"
}

export interface LocalitySearchResult {
  localities: MeilisearchLocalityDocument[]
  count: number
  processingTimeMs: number
}

const emptyLocalitySearchResult: LocalitySearchResult = {
  localities: [],
  count: 0,
  processingTimeMs: 0,
}

export async function searchLocalities(
  query: string,
  limit = 8,
  filters: LocalitySearchFilters = {}
): Promise<LocalitySearchResult> {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 2) {
    return emptyLocalitySearchResult
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
    limit: String(limit),
  })

  if (filters.country) {
    params.set("country", filters.country)
  }
  if (filters.state) {
    params.set("state", filters.state)
  }

  try {
    const url = `${resolveMedusaBaseUrl()}/store/localities/autocomplete?${params.toString()}`
    const response = PUBLISHABLE_API_KEY
      ? await fetch(url, {
          headers: {
            "x-publishable-api-key": PUBLISHABLE_API_KEY,
          },
        })
      : await fetch(url)

    if (!response.ok) {
      console.warn("Locality search failed:", response.status)
      return emptyLocalitySearchResult
    }

    return (await response.json()) as LocalitySearchResult
  } catch (error) {
    console.warn("Locality search failed:", error)
    return emptyLocalitySearchResult
  }
}
