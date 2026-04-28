type VariantTitleSource = {
  subtitle?: string | null
  variant_title?: string | null
  variant?: {
    title?: string | null
  } | null
}

const DEFAULT_VARIANT_TITLES = new Set(["default", "default variant", "default title"])

export function getNormalizedVariantTitle(title?: string | null) {
  const normalizedTitle = title?.trim() ?? ""

  if (!normalizedTitle || DEFAULT_VARIANT_TITLES.has(normalizedTitle.toLowerCase())) {
    return null
  }

  return normalizedTitle
}

export function getCartItemVariantTitle(item: VariantTitleSource) {
  return (
    getNormalizedVariantTitle(item.variant_title) ??
    getNormalizedVariantTitle(item.subtitle) ??
    getNormalizedVariantTitle(item.variant?.title)
  )
}
