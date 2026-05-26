const PLACEHOLDER_HOST = "placehold.co"
const RASTER_FORMATS = new Set(["png", "jpg", "jpeg", "webp", "avif", "gif"])
const RASTER_EXTENSION = /\.(png|jpe?g|webp|avif|gif)$/i

export function normalizeOptimizableImageUrl(src: string): string
export function normalizeOptimizableImageUrl(
  src: string | null | undefined
): string | null | undefined
export function normalizeOptimizableImageUrl(src: string | null | undefined) {
  if (!src) {
    return src
  }

  try {
    const url = new URL(src)

    if (url.hostname !== PLACEHOLDER_HOST) {
      return src
    }

    const segments = url.pathname.split("/").filter(Boolean)
    const lastSegment = segments[segments.length - 1]?.toLowerCase() || ""
    const hasRasterFormat =
      RASTER_EXTENSION.test(lastSegment) ||
      segments.some((segment) => RASTER_FORMATS.has(segment.toLowerCase()))

    if (hasRasterFormat || segments.length === 0) {
      return url.toString()
    }

    url.pathname = `${url.pathname.replace(/\/$/, "")}/png`
    return url.toString()
  } catch {
    return src
  }
}
