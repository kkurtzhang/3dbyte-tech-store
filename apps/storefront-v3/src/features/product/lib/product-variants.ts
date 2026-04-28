import type { MedusaProduct, MedusaProductVariant } from "@/lib/medusa/types"

type ProductOption = NonNullable<MedusaProduct["options"]>[number]

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() || ""
}

function getUniqueOptionValues(option: ProductOption) {
  return Array.from(
    new Set(
      (option.values || [])
        .map((value) => normalizeValue(value.value))
        .filter(Boolean)
    )
  )
}

export function isDefaultOnlyOption(option: ProductOption) {
  const optionTitle = normalizeValue(option.title)
  const optionValues = getUniqueOptionValues(option)

  if (optionValues.length !== 1) {
    return false
  }

  const [onlyValue] = optionValues
  const isDefaultLikeValue =
    onlyValue === "default" ||
    onlyValue === "default variant" ||
    onlyValue === "default title" ||
    onlyValue.startsWith("default ")

  const isGenericOptionTitle =
    optionTitle === "title" ||
    optionTitle === "variant" ||
    optionTitle === "default"

  return isDefaultLikeValue || isGenericOptionTitle
}

export function getDisplayableProductOptions(options: MedusaProduct["options"]) {
  return (options || []).filter((option) => !isDefaultOnlyOption(option))
}

export function getVariantOptionsMap(variant: MedusaProductVariant | undefined) {
  if (!variant?.options) {
    return {}
  }

  return variant.options.reduce<Record<string, string>>((accumulator, option) => {
    if (option.option_id && option.value) {
      accumulator[option.option_id] = option.value
    }

    return accumulator
  }, {})
}

export function findVariantMatchingOptions(
  variants: MedusaProduct["variants"],
  selectedOptions: Record<string, string>
) {
  if (!variants?.length) {
    return undefined
  }

  if (Object.keys(selectedOptions).length === 0) {
    return variants[0]
  }

  return variants?.find((variant) =>
    (variant.options?.length
      ? variant.options.every(
      (option) =>
        Boolean(option.option_id) &&
        selectedOptions[option.option_id as string] === option.value
        )
      : true)
  )
}
