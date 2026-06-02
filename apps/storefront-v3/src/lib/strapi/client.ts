function withoutRevalidate<T extends { revalidate?: unknown } | undefined>(
  options: T
) {
  if (!options) {
    return undefined
  }

  const { revalidate: _revalidate, ...optionsWithoutRevalidate } = options

  return optionsWithoutRevalidate
}

export const strapiClient = {
  baseUrl: process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337",
  token: process.env.STRAPI_READ_TOKEN || process.env.NEXT_PUBLIC_STRAPI_READ_TOKEN,

  async fetch<T>(endpoint: string, options?: RequestInit & { tags?: string[] }): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`
    const { tags, ...fetchOptions } = options || {}
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (fetchOptions?.headers) {
      Object.assign(headers, fetchOptions.headers as Record<string, string>)
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    const nextOptions =
      fetchOptions.cache === "no-store"
        ? {
            tags,
            ...withoutRevalidate(fetchOptions.next),
          }
        : {
            revalidate: 3600,
            tags,
            ...fetchOptions.next,
          }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      next: nextOptions,
    })

    if (!response.ok) {
      throw new Error(`Strapi fetch failed: ${response.statusText} (${response.status})`)
    }

    return response.json()
  },
}
