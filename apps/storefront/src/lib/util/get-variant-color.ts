import { VariantColor } from 'types/strapi'

export const getVariantColor = (
  variantName: string,
  colors: VariantColor[]
) => {
  console.log("variantName: ", variantName)
  console.log("colors:: ", colors)
  const color = colors.find((c) => c.Name === variantName)
  console.log("color::: ",color)
  return color?.Type?.[0]
}
