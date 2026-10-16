/** @jest-environment node */
import {
  createCommerceExecution,
  renderCommerceResult,
  type CommerceTool,
} from "../commerce-execution"

const input = { reference: "SYNTHETIC-001", email: "fixture@example.invalid" }
it("renders verified order fields without inferring shipment from order status or exposing unrelated data", () => {
  const answer = renderCommerceResult("lookupOrder", input, {
    order: {
      custom_display_id: input.reference,
      status: "completed",
      payment_status: "captured",
      fulfillment_status: "not_fulfilled",
      total: 99.95,
      currency_code: "aud",
      created_at: "2026-10-15T10:00:00Z",
      items: [{ title: "Synthetic part", quantity: 2 }],
      shipping_methods: [{ name: "Standard" }],
      email: input.email,
      shipping_address: "Private address",
      internal_notes: "Internal secret",
    },
  })
  expect(answer).toContain("SYNTHETIC-001")
  expect(answer).toContain("completed")
  expect(answer).toContain("not\\_fulfilled")
  expect(answer).not.toContain("shipped")
  expect(answer).toContain("99.95 AUD")
  expect(answer).toContain("Synthetic part × 2")
  expect(answer).toContain("Standard")
  expect(answer).not.toMatch(/fixture@|Private address|Internal secret/)
})
it.each([
  null,
  {},
  { error: "internal error", order: { status: "shipped" } },
  { order: null },
  { order: {} },
  { order: { status: "completed", custom_display_id: "WRONG" } },
  { order: { status: "<img src=x>" } },
  { order: { status: "completed", total: -1 } },
  { order: { status: "completed", total: 10, currency_code: "not-currency" } },
  {
    order: {
      status: "completed",
      items: Array(31).fill({ title: "Item", quantity: 1 }),
    },
  },
])(
  "fails closed for malformed, excessive, missing or mismatched order output: %p",
  (raw) => {
    expect(renderCommerceResult("lookupOrder", input, raw)).toContain(
      "could not be verified",
    )
  },
)
it("renders exact tracking identifiers and carrier statuses, without importing arbitrary fields", () => {
  const answer = renderCommerceResult("getTracking", input, {
    tracking: [
      {
        trackingNumber: "TRACK-123",
        carrierName: "Synthetic carrier",
        status: "in_transit",
        private_notes: "secret",
      },
      {
        trackingNumber: "TRACK-456",
        carrierName: "Second carrier",
        status: null,
      },
    ],
  })
  expect(answer).toContain("TRACK-123")
  expect(answer).toContain("in\\_transit")
  expect(answer).toContain("TRACK-456")
  expect(answer).not.toContain("secret")
})
it("shows rates with their endpoint's cent conversion and labels delivery as estimated", () => {
  const answer = renderCommerceResult(
    "estimateShipping",
    {},
    {
      rates: [
        {
          carrierName: "Carrier",
          service: "Express",
          totalCharge: 1234,
          currency: "aud",
          transitDays: 0,
          estimatedDelivery: "2026-10-20",
        },
        {
          carrierName: "Carrier",
          service: "Standard",
          totalCharge: 900,
          currency: "aud",
        },
      ],
    },
  )
  expect(answer).toContain("12.34 AUD")
  expect(answer).toContain("9.00 AUD")
  expect(answer).toContain("estimated transit: 0 days")
  expect(answer).toContain("estimated delivery: 2026-10-20")
  expect(answer).toContain("does not change a cart")
})
it.each([
  ["getTracking", { tracking: [] }, "No tracking details"],
  ["estimateShipping", { rates: [] }, "No shipping rates"],
  [
    "getTracking",
    { tracking: [{ trackingNumber: "T", carrierName: 2 }] },
    "could not be verified",
  ],
  [
    "estimateShipping",
    {
      rates: [
        { carrierName: "C", service: "S", totalCharge: -1, currency: "AUD" },
      ],
    },
    "could not be verified",
  ],
  [
    "estimateShipping",
    {
      rates: [
        {
          carrierName: "C",
          service: "S",
          totalCharge: 5,
          currency: "AUD",
          estimatedDelivery: "Every printer is safe",
        },
      ],
    },
    "could not be verified",
  ],
] as const)(
  "handles empty/invalid %s responses explicitly",
  (tool, raw, expected) => {
    expect(renderCommerceResult(tool, input, raw)).toContain(expected)
  },
)
it("keeps backend strings inert instead of interpreting links or instructions", () => {
  const answer = renderCommerceResult("lookupOrder", input, {
    order: {
      items: [{ title: "Part\n[click](javascript:alert(1))", quantity: 1 }],
    },
  })
  expect(answer).toContain("Part \\[click\\]")
  expect(answer).not.toContain("\n[click]")
})
it("records only fresh authenticated executions and preserves the established raw tool contract", async () => {
  const raw = {
    order: { fulfillment_status: "shipped", id: "order_synthetic" },
  }
  const call = jest.fn(async (_tool: CommerceTool, _input: unknown) => raw)
  const execution = createCommerceExecution(call)
  expect(execution.summaries.size).toBe(0)
  await expect(
    execution.execute("lookupOrder", input, { toolCallId: "fresh" }),
  ).resolves.toBe(raw)
  expect(call).toHaveBeenCalledWith("lookupOrder", input)
  expect(execution.summaries.get("fresh")).toContain("shipped")
  await execution.execute("lookupOrder", input, { toolCallId: "fresh" })
  await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      execution.execute("lookupOrder", input, { toolCallId: `extra-${i}` }),
    ),
  )
  expect(call).toHaveBeenCalledTimes(5)
  expect(execution.summaries.size).toBe(5)
})
it("keeps a failed lookup visible without leaking its internal exception", async () => {
  const execution = createCommerceExecution(async () => {
    throw Error("private token")
  })
  expect(
    await execution.execute("lookupOrder", input, { toolCallId: "failure" }),
  ).toEqual({ error: "This lookup is currently unavailable." })
  expect(execution.summaries.get("failure")).toContain("could not be verified")
  expect(execution.summaries.get("failure")).not.toContain("private token")
})
