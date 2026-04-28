"use server"

import { z } from "zod"
import { addToCart, createCart, getShippingOptions, updateCart } from "@/lib/medusa/cart"
import { sdk } from "@/lib/medusa/client"
import {
  isValidAustralianPostcode,
  normalizePostcodeInput,
  sortShippingEstimateOptions,
  type ProductShippingEstimateOption,
} from "@/features/product/lib/product-shipping-estimate"

const shippingEstimateSchema = z.object({
  variantId: z.string().trim().min(1),
  postalCode: z.string().trim().min(1).max(10),
  countryCode: z.string().trim().length(2).default("au"),
})

type StoreShippingOption = {
  id: string
  name?: string | null
  description?: string | null
  amount?: number | null
  price_type?: string | null
}

type CalculatedShippingResponse = {
  shipping_option?: {
    amount?: number | null
  }
}

export async function estimateProductShippingAction(input: unknown):
  Promise<
    | {
        success: true
        postcode: string
        options: ProductShippingEstimateOption[]
      }
    | {
        success: false
        error: string
      }
  > {
  const parsedInput = shippingEstimateSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      error: "Please enter a valid shipping postcode before requesting an estimate.",
    }
  }

  const postalCode = normalizePostcodeInput(parsedInput.data.postalCode)

  if (!isValidAustralianPostcode(postalCode)) {
    return {
      success: false,
      error: "Enter a valid 4-digit Australian postcode.",
    }
  }

  const countryCode = parsedInput.data.countryCode.toLowerCase()

  try {
    const cart = await createCart()

    await addToCart({
      cartId: cart.id,
      variantId: parsedInput.data.variantId,
      quantity: 1,
    })

    await updateCart({
      cartId: cart.id,
      data: {
        shipping_address: {
          country_code: countryCode,
          postal_code: postalCode,
        },
      },
    })

    const shippingOptions = (await getShippingOptions(cart.id)) as StoreShippingOption[]
    const currencyCode = cart.region?.currency_code || "aud"

    const options = await Promise.all(
      shippingOptions.map(async (option) => {
        let amount = option.amount ?? 0
        const priceType = option.price_type || "flat"

        if (priceType === "calculated") {
          const result = (await sdk.store.fulfillment.calculate(option.id, {
            cart_id: cart.id,
            data: {
              postal_code: postalCode,
              country_code: countryCode,
            },
          })) as CalculatedShippingResponse

          if (typeof result.shipping_option?.amount === "number") {
            amount = result.shipping_option.amount
          }
        }

        return {
          id: option.id,
          name: option.name?.trim() || "Shipping",
          description: option.description?.trim() || "Calculated at checkout",
          amount,
          currencyCode,
          priceType,
        } satisfies ProductShippingEstimateOption
      })
    )

    const sortedOptions = sortShippingEstimateOptions(options)

    if (!sortedOptions.length) {
      return {
        success: false,
        error: "No shipping methods are currently available for this postcode.",
      }
    }

    return {
      success: true,
      postcode: postalCode,
      options: sortedOptions,
    }
  } catch (error) {
    console.error("Failed to estimate product shipping", error)

    return {
      success: false,
      error: "Unable to calculate postage right now. Please try again shortly.",
    }
  }
}
