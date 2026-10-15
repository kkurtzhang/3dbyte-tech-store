import { z } from "zod"
import { plainMarkdown } from "./grounded-text"

export const COMMERCE_PATHS = {
  lookupOrder: "/ai/order-lookup",
  getTracking: "/ai/tracking",
  estimateShipping: "/ai/shipping-estimate",
} as const
export type CommerceTool = keyof typeof COMMERCE_PATHS
const text = z.string().trim().min(1).max(300)
const status = z
  .string()
  .max(80)
  .regex(/^[a-zA-Z][a-zA-Z0-9 _-]*$/)
  .nullish()
const amount = z.number().finite().nonnegative()
const currency = z.string().regex(/^[a-zA-Z]{3}$/)
const orderSchema = z.object({
  order: z
    .object({
      custom_display_id: text.nullish(),
      status,
      payment_status: status,
      fulfillment_status: status,
      total: amount.nullish(),
      currency_code: currency.nullish(),
      created_at: z.string().datetime({ offset: true }).nullish(),
      items: z
        .array(
          z.object({ title: text, quantity: z.number().finite().positive() }),
        )
        .max(30)
        .optional(),
      shipping_methods: z
        .array(z.object({ name: text }))
        .max(10)
        .optional(),
    })
    .nullable(),
})
const trackingSchema = z.object({
  tracking: z
    .array(
      z.object({
        trackingNumber: text,
        carrierName: text,
        status,
      }),
    )
    .max(30),
})
const ratesSchema = z.object({
  rates: z
    .array(
      z.object({
        carrierName: text,
        service: text,
        totalCharge: amount,
        currency,
        transitDays: z.number().finite().nonnegative().nullish(),
        estimatedDelivery: z
          .union([z.string().date(), z.string().datetime({ offset: true })])
          .nullish(),
      }),
    )
    .max(30),
})
const labels = {
  lookupOrder: "Order lookup",
  getTracking: "Tracking",
  estimateShipping: "Shipping estimates",
}
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)

/** Only whitelisted fields from this request's authenticated executions become prose. */
export function renderCommerceResult(
  tool: CommerceTool,
  input: unknown,
  raw: unknown,
) {
  const reference =
    record(input) && typeof input.reference === "string"
      ? plainMarkdown(input.reference.slice(0, 120))
      : ""
  const heading = `### ${labels[tool]}${reference ? ` — ${reference}` : ""}`
  const unavailable = `${heading}\n\nThis lookup could not be verified. No current result is available.`
  if (!record(raw) || "error" in raw) return unavailable
  if (tool === "lookupOrder") {
    const result = orderSchema.safeParse(raw)
    if (!result.success || !result.data.order) return unavailable
    const order = result.data.order
    // The authenticated backend resolves the requested reference; reject a contradictory identity.
    if (
      order.custom_display_id &&
      record(input) &&
      order.custom_display_id !== input.reference
    )
      return unavailable
    const lines = [
      ...(
        [
          ["Order status", order.status],
          ["Payment status", order.payment_status],
          ["Fulfillment status", order.fulfillment_status],
        ] as const
      ).flatMap(([label, value]) =>
        value ? [`- **${label}:** ${plainMarkdown(value)}`] : [],
      ),
      ...(order.total != null && order.currency_code
        ? [
            `- **Order total:** ${order.total} ${order.currency_code.toUpperCase()}`,
          ]
        : []),
      ...(order.created_at
        ? [`- **Created:** ${plainMarkdown(order.created_at)}`]
        : []),
      ...(order.items ?? []).map(
        (item) => `- **Item:** ${plainMarkdown(item.title)} × ${item.quantity}`,
      ),
      ...(order.shipping_methods ?? []).map(
        (method) => `- **Shipping method:** ${plainMarkdown(method.name)}`,
      ),
    ]
    return lines.length ? [heading, ...lines].join("\n\n") : unavailable
  }
  if (tool === "getTracking") {
    const result = trackingSchema.safeParse(raw)
    if (!result.success) return unavailable
    return [
      heading,
      ...(result.data.tracking.length
        ? result.data.tracking.map(
            (item) =>
              `- **${plainMarkdown(item.carrierName)}:** ${plainMarkdown(item.trackingNumber)}${item.status ? `; status: ${plainMarkdown(item.status)}` : ""}`,
          )
        : ["No tracking details were returned for this verified lookup."]),
    ].join("\n\n")
  }
  const result = ratesSchema.safeParse(raw)
  if (!result.success) return unavailable
  return [
    heading,
    "Estimates only; this lookup does not change a cart or purchase shipping.",
    ...(result.data.rates.length
      ? result.data.rates.map(
          (rate) =>
            // This endpoint explicitly converts the carrier's major-unit charge to cents.
            `- **${plainMarkdown(rate.carrierName)} — ${plainMarkdown(rate.service)}:** ${(rate.totalCharge / 100).toFixed(2)} ${rate.currency.toUpperCase()}${rate.transitDays != null ? `; estimated transit: ${rate.transitDays} days` : ""}${rate.estimatedDelivery ? `; estimated delivery: ${plainMarkdown(rate.estimatedDelivery)}` : ""}`,
        )
      : [
          "No shipping rates were returned for the supplied items and destination.",
        ]),
  ].join("\n\n")
}

export function createCommerceExecution(
  call: (tool: CommerceTool, input: unknown) => Promise<unknown>,
) {
  const summaries = new Map<string, string>()
  return {
    summaries,
    async execute(
      tool: CommerceTool,
      input: unknown,
      { toolCallId }: { toolCallId: string },
    ) {
      if (summaries.has(toolCallId) || summaries.size >= 5)
        return { error: "Lookup limit reached." }
      summaries.set(toolCallId, renderCommerceResult(tool, input, null))
      try {
        const result = await call(tool, input)
        summaries.set(toolCallId, renderCommerceResult(tool, input, result))
        // Preserve the existing tool contract; only validated fields are used for grounded prose.
        return result
      } catch {
        return { error: "This lookup is currently unavailable." }
      }
    },
  }
}
export type CommerceExecution = ReturnType<typeof createCommerceExecution>
