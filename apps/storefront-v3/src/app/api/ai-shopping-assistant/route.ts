import { createOpenAI } from "@ai-sdk/openai"
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
} from "ai"
import { z } from "zod"

import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url"
import { checkRateLimit } from "@/lib/security/rate-limit"

const assistantTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().trim().min(1).max(4_000),
})

const assistantMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000).optional(),
    parts: z.array(assistantTextPartSchema).min(1).max(20).optional(),
  })
  .superRefine((message, ctx) => {
    const content = getAssistantMessageContent(message)

    if (!content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assistant message content is required",
      })
    }

    if (content.length > 4_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assistant message content is too long",
      })
    }
  })

function getAssistantMessageContent(message: {
  content?: string
  parts?: Array<{ text: string; type: string }>
}) {
  return (
    message.content ??
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("") ??
    ""
  ).trim()
}

const assistantRequestSchema = z.object({
  messages: z.array(assistantMessageSchema).min(1).max(20),
})

const productSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(6).default(4),
})

const orderProofInputSchema = z.object({
  reference: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
})

const shippingEstimateInputSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(99).default(1),
      })
    )
    .min(1)
    .max(20),
  destination: z.object({
    city: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(12),
    countryCode: z.string().trim().length(2).default("AU"),
    province: z.string().trim().max(16).optional(),
  }),
})

const supportTicketInputSchema = z.object({
  confirmedByCustomer: z.literal(true),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(4_000),
  category: z
    .enum([
      "general",
      "product_support",
      "order_status",
      "shipping",
      "returns_refunds",
      "account",
      "wholesale",
      "other",
    ])
    .default("general"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  customerId: z.string().trim().max(80).optional(),
  orderId: z.string().trim().max(80).optional(),
  orderReference: z.string().trim().max(80).optional(),
  productId: z.string().trim().max(80).optional(),
  productHandle: z.string().trim().max(160).optional(),
  aiSummary: z.string().trim().max(1_000).optional(),
  transcriptExcerpt: z.string().trim().max(4_000).optional(),
  consentToIncludeTranscript: z.boolean().default(false),
  verifiedOrderContext: z.record(z.unknown()).optional(),
})

const systemPrompt = [
  "You are the 3D Byte Tech shopping assistant.",
  "Use only provided product, search, Strapi, Medusa, order, tracking, shipping, and support-ticket context.",
  "You are suggest-only for shopping: recommend product cards, links, and next steps the customer clicks themselves.",
  "Never place orders, modify carts, add items, refund, cancel, or mutate customer data.",
  "For order or tracking help, require the customer to provide both order reference and email proof.",
  "You may create a support ticket only after explicit customer confirmation and after collecting name, email, subject, and message.",
  "Do not include transcript excerpts in a ticket unless the customer explicitly consents.",
  "Keep answers concise and mention uncertainty when context is incomplete.",
].join(" ")

function getConfig() {
  const provider = process.env.AI_PROVIDER || "deepseek"
  const apiKey = process.env.DEEPSEEK_API_KEY
  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1"
  const model = process.env.AI_MODEL || "deepseek-chat"
  const internalToken = process.env.INTERNAL_API_TOKEN
  const backendUrl = resolveMedusaBaseUrl({ isServer: true })

  if (provider !== "deepseek" || !apiKey || !internalToken || !backendUrl) {
    return null
  }

  return { apiKey, backendUrl, baseURL, internalToken, model }
}

async function callInternalBackend<T>(
  path: string,
  body: unknown,
  config: NonNullable<ReturnType<typeof getConfig>>
): Promise<T> {
  const response = await fetch(`${config.backendUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-3db-internal-token": config.internalToken,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return {
      error: "The store assistant could not verify that request right now.",
    } as T
  }

  return response.json() as Promise<T>
}

function toSupportTicketPayload(
  input: z.infer<typeof supportTicketInputSchema>
) {
  return {
    source: "ai_chat",
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    category: input.category,
    priority: input.priority,
    customer_id: input.customerId,
    order_id: input.orderId,
    order_reference: input.orderReference,
    product_id: input.productId,
    product_handle: input.productHandle,
    ai_summary: input.aiSummary,
    transcript_excerpt: input.consentToIncludeTranscript
      ? input.transcriptExcerpt
      : undefined,
    consent_to_include_transcript: input.consentToIncludeTranscript,
    verified_order_context: input.verifiedOrderContext,
  }
}

export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const rate = checkRateLimit(`ai-shopping-assistant:${ip}`, 12, 60_000)

  if (!rate.allowed) {
    return Response.json(
      { error: "Too many assistant requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rate.retryAfterMs / 1000).toString(),
        },
      }
    )
  }

  const parsed = assistantRequestSchema.safeParse(await req.json().catch(() => null))

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid assistant request" },
      { status: 400 }
    )
  }

  const config = getConfig()

  if (!config) {
    return Response.json(
      { error: "Assistant configuration is incomplete" },
      { status: 503 }
    )
  }

  const deepseek = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    name: "deepseek",
  })
  const uiMessages = parsed.data.messages.map((message) => ({
    role: message.role,
    parts: [
      { type: "text" as const, text: getAssistantMessageContent(message) },
    ],
  }))
  const result = streamText({
    model: deepseek.chat(config.model),
    system: systemPrompt,
    messages: await convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(5),
    tools: {
      searchProducts: tool({
        description:
          "Search published products and retrieve authoritative Medusa, Meilisearch, and Strapi context.",
        inputSchema: productSearchInputSchema,
        execute: (input) =>
          callInternalBackend("/ai/product-guidance", input, config),
      }),
      lookupOrder: tool({
        description:
          "Look up read-only order status after the customer provides order reference and email proof.",
        inputSchema: orderProofInputSchema,
        execute: (input) =>
          callInternalBackend("/ai/order-lookup", input, config),
      }),
      getTracking: tool({
        description:
          "Retrieve read-only tracking details after the customer provides order reference and email proof.",
        inputSchema: orderProofInputSchema,
        execute: (input) => callInternalBackend("/ai/tracking", input, config),
      }),
      estimateShipping: tool({
        description:
          "Estimate shipping from chosen variants and destination fields without changing a cart.",
        inputSchema: shippingEstimateInputSchema,
        execute: (input) =>
          callInternalBackend("/ai/shipping-estimate", input, config),
      }),
      createSupportTicket: tool({
        description:
          "Create a human support ticket only after the customer explicitly confirms the handoff and provides required contact fields.",
        inputSchema: supportTicketInputSchema,
        execute: (input) =>
          callInternalBackend(
            "/ai/support-ticket",
            toSupportTicketPayload(input),
            config
          ),
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
