import {
  authorizeHermesProductDraftRequest,
  hermesProductDraftPayloadLimit,
  isHermesProductDraftPayloadTooLarge,
} from "../security"

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

function createRequest(token?: string) {
  return {
    headers: {
      "x-3db-hermes-product-draft-token": token,
    },
  }
}

describe("authorizeHermesProductDraftRequest", () => {
  const originalToken = process.env.HERMES_PRODUCT_DRAFT_TOKEN

  afterEach(() => {
    process.env.HERMES_PRODUCT_DRAFT_TOKEN = originalToken
  })

  it("rejects requests when the Hermes token is not configured", () => {
    delete process.env.HERMES_PRODUCT_DRAFT_TOKEN
    const res = createResponse()

    const authorized = authorizeHermesProductDraftRequest(
      createRequest("secret") as never,
      res as never
    )

    expect(authorized).toBe(false)
    expect(res.status).toHaveBeenCalledWith(503)
  })

  it("rejects wrong tokens and accepts the dedicated Hermes token", () => {
    process.env.HERMES_PRODUCT_DRAFT_TOKEN = "secret"
    const rejectedRes = createResponse()
    const acceptedRes = createResponse()

    expect(
      authorizeHermesProductDraftRequest(
        createRequest("INTERNAL_API_TOKEN") as never,
        rejectedRes as never
      )
    ).toBe(false)
    expect(rejectedRes.status).toHaveBeenCalledWith(401)

    expect(
      authorizeHermesProductDraftRequest(
        createRequest("secret") as never,
        acceptedRes as never
      )
    ).toBe(true)
    expect(acceptedRes.status).not.toHaveBeenCalled()
  })
})

describe("hermesProductDraftPayloadLimit", () => {
  const originalLimit = process.env.AI_PRODUCT_DRAFT_MAX_BYTES

  afterEach(() => {
    process.env.AI_PRODUCT_DRAFT_MAX_BYTES = originalLimit
  })

  it("rejects Hermes payloads over the configured content-length limit", async () => {
    process.env.AI_PRODUCT_DRAFT_MAX_BYTES = "10"
    const req = {
      headers: {
        "content-length": "11",
      },
    }
    const res = createResponse()
    const next = jest.fn()

    await hermesProductDraftPayloadLimit(req as never, res as never, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(413)
  })

  it("measures the parsed body when content-length is unavailable", () => {
    process.env.AI_PRODUCT_DRAFT_MAX_BYTES = "15"

    expect(isHermesProductDraftPayloadTooLarge({ value: "1234567890" })).toBe(
      true
    )
    expect(isHermesProductDraftPayloadTooLarge({ value: "1" })).toBe(false)
  })
})
