import {
  findVariantMatchingOptions,
  getDisplayableProductOptions,
  getVariantOptionsMap,
  isDefaultOnlyOption,
} from "../product-variants"
import type { MedusaProduct, MedusaProductVariant } from "@/lib/medusa/types"

function createOption(overrides: Partial<NonNullable<MedusaProduct["options"]>[number]>) {
  return {
    id: "option_1",
    title: "Title",
    values: [{ id: "value_1", value: "Default Title" }],
    ...overrides,
  } as NonNullable<MedusaProduct["options"]>[number]
}

function createVariant(
  id: string,
  options: Array<{ option_id: string; value: string }>
) {
  return {
    id,
    options,
  } as MedusaProductVariant
}

describe("product variant helpers", () => {
  it("identifies default-only product options", () => {
    expect(isDefaultOnlyOption(createOption({}))).toBe(true)
  })

  it("keeps meaningful product options", () => {
    expect(
      isDefaultOnlyOption(
        createOption({
          title: "Size",
          values: [
            { id: "value_1", value: "0.4mm" },
            { id: "value_2", value: "0.6mm" },
          ],
        })
      )
    ).toBe(false)
  })

  it("filters default-only selectors from rendered options", () => {
    const options = [
      createOption({}),
      createOption({
        id: "option_2",
        title: "Size",
        values: [
          { id: "value_2", value: "0.4mm" },
          { id: "value_3", value: "0.6mm" },
        ],
      }),
    ]

    expect(getDisplayableProductOptions(options)).toEqual([options[1]])
  })

  it("builds option maps from a selected variant", () => {
    const variant = createVariant("variant_1", [
      { option_id: "size", value: "0.4mm" },
      { option_id: "material", value: "Brass" },
    ])

    expect(getVariantOptionsMap(variant)).toEqual({
      size: "0.4mm",
      material: "Brass",
    })
  })

  it("finds the variant that matches selected options", () => {
    const variants = [
      createVariant("variant_1", [{ option_id: "size", value: "0.4mm" }]),
      createVariant("variant_2", [{ option_id: "size", value: "0.6mm" }]),
    ]

    expect(findVariantMatchingOptions(variants, { size: "0.6mm" })?.id).toBe("variant_2")
  })

  it("falls back to the first variant when no option map is available", () => {
    const variants = [
      {
        id: "variant_1",
      } as MedusaProductVariant,
      createVariant("variant_2", [{ option_id: "size", value: "0.6mm" }]),
    ]

    expect(findVariantMatchingOptions(variants, {} as Record<string, string>)?.id).toBe("variant_1")
  })
})
