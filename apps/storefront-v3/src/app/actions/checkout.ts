"use server"

import { cookies } from "next/headers"
import {
  updateCart,
  addShippingMethod,
  completePreorderCart,
  initiatePaymentSession,
  getCart,
  getShippingOptions,
  calculateShippingOption,
} from "@/lib/medusa/cart"
import { getLiveShippingRates, type ShippingRate } from "@/lib/medusa/shipping"
import { getShippingServiceDisplayName } from "@/lib/shipping/display-name"
import { z } from "zod"

const CART_COOKIE = "_medusa_cart_id"
const checkoutAddressSchema = z.object({
  email: z.string().email(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  address_1: z.string().trim().min(1).max(200),
  address_2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1).max(100),
  country_code: z.string().trim().length(2),
  postal_code: z.string().trim().min(1).max(20),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
})

function getPaymentSetupErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Failed to init payment session"

  if (
    /restricted API key/i.test(message) ||
    /required permissions/i.test(message) ||
    /stripe payment intent/i.test(message)
  ) {
    return "Payment setup is temporarily unavailable. Please contact support so we can complete your order."
  }

  return message
}

type StoreShippingOption = {
  id: string
  name?: string | null
  description?: string | null
  amount?: number | null
  price_type?: string | null
}

type ResolvedStoreShippingOption = StoreShippingOption & {
  amount: number
}

type ShippingMethodSelectionData = {
  selected_rate_id?: string
  service?: string
  service_name?: string
  carrier_id?: string
  carrier_name?: string
}

function isResolvedShippingOption(
  option: ResolvedStoreShippingOption | null
): option is ResolvedStoreShippingOption {
  return option !== null
}

function findLiveRateForOption(
  option: StoreShippingOption,
  rates: ShippingRate[]
): ShippingRate | undefined {
  const optionDisplayName = getShippingServiceDisplayName({
    description: option.description,
    name: option.name,
  })

  return rates.find((rate) => {
    const rateDisplayName = getShippingServiceDisplayName({
      carrierName: rate.carrier.name,
      service: rate.service,
      serviceName: rate.serviceName,
    })

    return rateDisplayName === optionDisplayName
  })
}

function minorUnitAmountToMajorUnitAmount(amount: number, currencyCode = "aud") {
  const zeroDecimalCurrencies = new Set([
    "bif",
    "clp",
    "djf",
    "gnf",
    "jpy",
    "kmf",
    "krw",
    "mga",
    "pyg",
    "rwf",
    "ugx",
    "vnd",
    "vuv",
    "xaf",
    "xof",
    "xpf",
  ])
  const normalizedCurrency = currencyCode.trim().toLowerCase()

  return zeroDecimalCurrencies.has(normalizedCurrency) ? amount : amount / 100
}

async function resolveShippingOptionAmount(
  cartId: string,
  option: StoreShippingOption,
  liveRates: ShippingRate[]
): Promise<number | null> {
  const liveRate = findLiveRateForOption(option, liveRates)
  if (liveRate) {
    return minorUnitAmountToMajorUnitAmount(liveRate.totalCharge, liveRate.currency)
  }

  if (option.price_type !== "calculated") {
    return typeof option.amount === "number" ? option.amount : null
  }

  return calculateShippingOption({
    cartId,
    optionId: option.id,
    data: {
      code: option.id,
      description: option.description,
      name: option.name,
    },
  })
}

export async function getShippingOptionsAction() {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found", options: [] }

  try {
    const options = (await getShippingOptions(cartId)) as StoreShippingOption[]
    const liveRates = await getLiveShippingRates(cartId)
      .then((response) => response.rates)
      .catch(() => [])
    const resolvedOptions = await Promise.all(
      options.map(async (option) => {
        const amount = await resolveShippingOptionAmount(cartId, option, liveRates)

        if (typeof amount !== "number") {
          return null
        }

        const liveRate = findLiveRateForOption(option, liveRates)

        return {
          ...option,
          amount,
          name: liveRate
            ? getShippingServiceDisplayName({
                carrierName: liveRate.carrier.name,
                service: liveRate.service,
                serviceName: liveRate.serviceName,
              })
            : option.name,
        }
      })
    )

    return {
      success: true,
      options: resolvedOptions.filter(isResolvedShippingOption),
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get shipping options"
    return { success: false, error: message, options: [] }
  }
}

export async function initPaymentSessionAction() {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found" }

  try {
    // We need the full cart object to pass to initiatePaymentSession
    const cart = await getCart(cartId)

    // Initialize payment session for Stripe
    // In Medusa v2, we initiate a session for a specific provider
    const paymentCollectionResponse = await initiatePaymentSession({
      cart,
      data: {
        payment_method_types: ["card"],
      },
      providerId: "pp_stripe_stripe",
    })
    const paymentCollection =
      paymentCollectionResponse?.payment_collection ?? paymentCollectionResponse

    return { success: true, paymentCollection }
  } catch (error: unknown) {
    return { success: false, error: getPaymentSetupErrorMessage(error) }
  }
}

export async function setAddressesAction(data: unknown) {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found" }

  try {
    const parsed = checkoutAddressSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: "Invalid address information" }
    }
    const address = parsed.data

    const cart = await updateCart({
      cartId,
      data: {
        email: address.email,
        shipping_address: {
          first_name: address.first_name,
          last_name: address.last_name,
          address_1: address.address_1,
          address_2: address.address_2,
          city: address.city,
          province: address.province,
          country_code: address.country_code.toLowerCase(),
          postal_code: address.postal_code,
          phone: address.phone,
        },
        billing_address: {
          first_name: address.first_name,
          last_name: address.last_name,
          address_1: address.address_1,
          address_2: address.address_2,
          city: address.city,
          province: address.province,
          country_code: address.country_code.toLowerCase(),
          postal_code: address.postal_code,
          phone: address.phone,
        },
      },
    })
    return { success: true, cart }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to set address"
    return { success: false, error: message }
  }
}

function sanitizeShippingMethodSelectionData(
  data: unknown
): ShippingMethodSelectionData | undefined {
  if (!data || typeof data !== "object") {
    return undefined
  }

  const input = data as Record<string, unknown>
  const sanitized: ShippingMethodSelectionData = {}
  for (const key of [
    "selected_rate_id",
    "service",
    "service_name",
    "carrier_id",
    "carrier_name",
  ] as const) {
    if (typeof input[key] === "string" && input[key].trim()) {
      sanitized[key] = input[key].trim()
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

export async function setShippingMethodAction(
  optionId: string,
  data?: unknown
) {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found" }
  if (!optionId?.trim()) return { success: false, error: "Invalid shipping option" }

  try {
    const options = (await getShippingOptions(cartId)) as StoreShippingOption[]
    const option = options.find((shippingOption) => shippingOption.id === optionId)
    const selectedRateData = sanitizeShippingMethodSelectionData(data)
    const cart = await addShippingMethod({
      cartId,
      optionId,
      data: option
        ? {
            code: option.id,
            description: option.description,
            name: option.name,
            ...selectedRateData,
          }
        : selectedRateData,
    })
    return { success: true, cart }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to set shipping method"
    return { success: false, error: message }
  }
}

export async function completeCartAction() {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, error: "No cart found" }

  try {
    const order = await completePreorderCart(cartId)
    cookieStore.delete(CART_COOKIE)
    return { success: true, order }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to complete order"
    return { success: false, error: message }
  }
}

export async function getLiveShippingRatesAction(): Promise<{
  success: boolean
  rates: ShippingRate[]
  error?: string
}> {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value

  if (!cartId) return { success: false, rates: [], error: "No cart found" }

  try {
    const response = await getLiveShippingRates(cartId)
    return { success: true, rates: response.rates }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch live rates"
    return { success: false, rates: [], error: message }
  }
}
