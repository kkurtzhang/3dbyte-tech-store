import type { MeilisearchAddressDocument } from "@3dbyte-tech-store/shared-types"

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "")

export interface AddressSearchResult {
  addresses: MeilisearchAddressDocument[]
  count: number
  processingTimeMs: number
}

const emptyAddressSearchResult: AddressSearchResult = {
  addresses: [],
  count: 0,
  processingTimeMs: 0,
}

export async function searchAddresses(
  query: string,
  limit = 8,
  country?: "AU" | "NZ"
): Promise<AddressSearchResult> {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 3) {
    return emptyAddressSearchResult
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
    limit: String(limit),
  })

  if (country) {
    params.set("country", country)
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/store/addresses/autocomplete?${params.toString()}`
    )

    if (!response.ok) {
      console.warn("Address search failed:", response.status)
      return emptyAddressSearchResult
    }

    return (await response.json()) as AddressSearchResult
  } catch (error) {
    console.warn("Address search failed:", error)
    return emptyAddressSearchResult
  }
}
