"use server"

import { z } from "zod"
import { addLineItems, addToCart, createCart, getShippingOptions, updateCart } from "@/lib/medusa/cart"
import { sdk } from "@/lib/medusa/client"
import { getLiveShippingRates } from "@/lib/medusa/shipping"
import { getShippingServiceDisplayName } from "@/lib/shipping/display-name"
import {
  inferAustralianStateFromPostcode,
  isValidAustralianPostcode,
  minorUnitAmountToMajorUnitAmount,
  normalizeLocalityInput,
  normalizePostcodeInput,
  sortShippingEstimateOptions,
  type ProductShippingEstimateOption,
} from "@/features/product/lib/product-shipping-estimate"

const shippingEstimateItemSchema = z.object({
  variantId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
})

const shippingEstimateSchema = z
  .object({
    variantId: z.string().trim().min(1).optional(),
    items: z.array(shippingEstimateItemSchema).min(1).max(50).optional(),
    postalCode: z.string().trim().min(1).max(10),
    city: z.string().trim().min(1).max(100),
    province: z.string().trim().max(3).optional(),
    countryCode: z.string().trim().length(2).default("au"),
  })
  .refine((value) => Boolean(value.variantId || value.items?.length), {
    message: "A product variant is required for shipping estimates.",
    path: ["variantId"],
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
    calculated_price?: {
      calculated_amount?: number | null
    }
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
  const city = normalizeLocalityInput(parsedInput.data.city)

  if (!isValidAustralianPostcode(postalCode)) {
    return {
      success: false,
      error: "Enter a valid 4-digit Australian postcode.",
    }
  }

  if (!city) {
    return {
      success: false,
      error: "Enter the delivery suburb or locality.",
    }
  }

  const countryCode = parsedInput.data.countryCode.toLowerCase()
  const province =
    parsedInput.data.province?.trim().toUpperCase() ||
    inferAustralianStateFromPostcode(postalCode)

  try {
    const cart = await createCart()
    const estimateItems = parsedInput.data.items?.length
      ? parsedInput.data.items.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
        }))
      : [
          {
            variant_id: parsedInput.data.variantId!,
            quantity: 1,
          },
        ]

    if (estimateItems.length === 1) {
      await addToCart({
        cartId: cart.id,
        variantId: estimateItems[0].variant_id,
        quantity: estimateItems[0].quantity,
      })
    } else {
      await addLineItems({
        cartId: cart.id,
        items: estimateItems,
      })
    }

    await updateCart({
      cartId: cart.id,
      data: {
        shipping_address: {
          city,
          country_code: countryCode,
          postal_code: postalCode,
          province,
        },
      },
    })

    const liveRates = await getLiveShippingRates(cart.id, {
      city,
      country_code: countryCode,
      postal_code: postalCode,
      province,
    })
    const liveRateOptions = liveRates.rates.map((rate) => ({
      id: rate.id,
      name: getShippingServiceDisplayName({
        carrierName: rate.carrier.name,
        service: rate.service,
        serviceName: rate.serviceName,
      }),
      description:
        typeof rate.transitDays === "number"
          ? `${rate.transitDays} business day${rate.transitDays === 1 ? "" : "s"}`
          : "Carrier-calculated rate",
      amount: minorUnitAmountToMajorUnitAmount(
        rate.totalCharge,
        rate.currency
      ),
      currencyCode: rate.currency,
      priceType: "calculated",
    } satisfies ProductShippingEstimateOption))

    if (liveRateOptions.length > 0) {
      return {
        success: true,
        postcode: postalCode,
        options: sortShippingEstimateOptions(liveRateOptions),
      }
    }

    const shippingOptions = (await getShippingOptions(cart.id)) as StoreShippingOption[]
    const currencyCode = cart.region?.currency_code || "aud"

    const options = await Promise.all(
      shippingOptions.map(async (option) => {
        let amount = minorUnitAmountToMajorUnitAmount(
          option.amount ?? 0,
          currencyCode
        )
        const priceType = option.price_type || "flat"

        if (priceType === "calculated") {
          const result = (await sdk.store.fulfillment.calculate(option.id, {
            cart_id: cart.id,
            data: {
              city,
              code: option.id,
              description: option.description,
              name: option.name,
              postal_code: postalCode,
              country_code: countryCode,
              province,
            },
          })) as CalculatedShippingResponse

          const calculatedAmount =
            result.shipping_option?.calculated_price?.calculated_amount ??
            result.shipping_option?.amount

          if (typeof calculatedAmount === "number") {
            amount = minorUnitAmountToMajorUnitAmount(
              calculatedAmount,
              currencyCode
            )
          }
        }

        return {
          id: option.id,
          name: getShippingServiceDisplayName({
            description: option.description,
            name: option.name,
          }),
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
