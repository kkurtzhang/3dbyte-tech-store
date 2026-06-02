export function resolveStrapiMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith("http://") || url.startsWith("https://")) return url

  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`
}
