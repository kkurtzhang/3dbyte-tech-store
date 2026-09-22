import { packetV3 } from "./quality-fixture"
import { draftReviewHash } from "../quality"
const prepareReplacement = (draft: unknown, body: unknown) =>
  require("../reprocess").prepareReplacement(draft, body)

describe("replace research safely", () => {
  const draft = {
    id: "old",
    status: "needs_review",
    product_input: packetV3.product_input,
    raw_packet: { packet_version: 2 },
  }
  const body = { packet: packetV3, review_hash: draftReviewHash(draft) }
  it("accepts fresh v3 research for the same product", () => {
    expect(prepareReplacement(draft, body).packet.packet_version).toBe(3)
  })
  it("rejects stale review, different product, legacy payload, and any imported work", () => {
    for (const [record, request] of [
      [draft, { ...body, review_hash: "stale" }],
      [
        draft,
        {
          ...body,
          packet: {
            ...packetV3,
            product_input: {
              ...packetV3.product_input,
              product_name: "Other product",
            },
          },
        },
      ],
      [draft, { ...body, packet: { packet_version: 2 } }],
      [{ ...draft, status: "imported" }, body],
      [{ ...draft, status: "approved" }, body],
      [
        {
          ...draft,
          import_progress: { medusa_product: { status: "completed" } },
        },
        body,
      ],
    ])
      expect(() => prepareReplacement(record, request)).toThrow()
  })
})
