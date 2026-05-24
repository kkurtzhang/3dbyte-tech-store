const productGraph = jest.fn()
const orderGraph = jest.fn()
const karrioFetchRates = jest.fn()
const meiliSearch = jest.fn()
const getProductDescription = jest.fn()

import { POST as productGuidancePOST } from "../product-guidance/route"
import { POST as orderLookupPOST } from "../order-lookup/route"
import { POST as trackingPOST } from "../tracking/route"
import { POST as shippingEstimatePOST } from "../shipping-estimate/route"

function createResponse() {
  return {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  }
}

function createScope() {
  return {
    resolve: jest.fn((key: string) => {
      if (key === "query") {
        return {
          graph: (input: unknown) => {
            const entity = (input as { entity?: string }).entity
            return entity === "order" || entity === "fulfillment"
              ? orderGraph(input)
              : productGraph(input)
          },
        }
      }

      if (key === "meilisearch") {
        return { search: meiliSearch }
      }

      if (key === "strapi") {
        return { getProductDescription }
      }

      if (key === "karrio") {
        return { fetchRates: karrioFetchRates }
      }

      throw new Error(`Unexpected dependency: ${key}`)
    }),
  }
}

function createRequest(body: unknown, token = "test-internal-token") {
  return {
    body,
    headers: {
      "x-3db-internal-token": token,
    },
    scope: createScope(),
  }
}

describe("internal AI routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.INTERNAL_API_TOKEN = "test-internal-token"
  })

  it("rejects product guidance without the internal token", async () => {
    const res = createResponse()

    await productGuidancePOST(
      createRequest({ query: "voron" }, "wrong-token") as never,
      res as never
    )

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    expect(meiliSearch).not.toHaveBeenCalled()
    expect(productGraph).not.toHaveBeenCalled()
  })

  it("builds product guidance from Meilisearch, Medusa, and Strapi context", async () => {
    meiliSearch.mockResolvedValue({
      hits: [
        {
          id: "prod_123",
          title: "LDO Voron 2.4 Kit",
          handle: "ldo-voron-24-kit",
          price_aud: 1499,
          in_stock: true,
          variants: [{ id: "var_123", sku: "LDO-V24", title: "Default" }],
        },
      ],
    })
    productGraph.mockResolvedValue({
      data: [
        {
          id: "prod_123",
          title: "LDO Voron 2.4 Kit",
          handle: "ldo-voron-24-kit",
          status: "published",
          description: "Complete kit for Voron builders.",
          variants: [{ id: "var_123", sku: "LDO-V24", title: "Default" }],
        },
      ],
    })
    getProductDescription.mockResolvedValue({
      rich_description: "Authoritative Strapi build guidance.",
      features: ["Complete motion kit"],
    })
    const res = createResponse()

    await productGuidancePOST(
      createRequest({ query: "beginner voron", limit: 2 }) as never,
      res as never
    )

    expect(meiliSearch).toHaveBeenCalledWith(
      "beginner voron",
      "product",
      expect.objectContaining({ limit: 2 })
    )
    expect(productGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "product",
        filters: { id: ["prod_123"] },
      })
    )
    expect(getProductDescription).toHaveBeenCalledWith("prod_123")
    expect(res.json).toHaveBeenCalledWith({
      products: [
        expect.objectContaining({
          id: "prod_123",
          handle: "ldo-voron-24-kit",
          authoritativeContext: expect.objectContaining({
            medusa: true,
            meilisearch: true,
            strapi: true,
          }),
        }),
      ],
    })
  })

  it("requires order proof before lookup", async () => {
    const res = createResponse()

    await orderLookupPOST(
      createRequest({ reference: "3DBO-123" }) as never,
      res as never
    )

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      order: null,
      error: "Order reference and email are required",
    })
    expect(orderGraph).not.toHaveBeenCalled()
  })

  it("does not disclose an order when proof email does not match", async () => {
    orderGraph.mockResolvedValue({
      data: [{ id: "order_123", email: "owner@example.com" }],
    })
    const res = createResponse()

    await orderLookupPOST(
      createRequest({
        reference: "3DBO-123",
        email: "other@example.com",
      }) as never,
      res as never
    )

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ order: null })
  })

  it("returns tracking only after order proof is verified", async () => {
    orderGraph.mockResolvedValue({
      data: [
        {
          id: "order_123",
          email: "customer@example.com",
          custom_display_id: "3DBO-123",
          fulfillments: [
            {
              id: "ful_123",
              status: "shipped",
              data: {
                tracking_number: "CP123456789AU",
                carrier_name: "Australia Post",
                tracking_url: "https://track.example/CP123456789AU",
              },
            },
          ],
        },
      ],
    })
    const res = createResponse()

    await trackingPOST(
      createRequest({
        reference: "3DBO-123",
        email: "customer@example.com",
      }) as never,
      res as never
    )

    expect(res.json).toHaveBeenCalledWith({
      tracking: [
        expect.objectContaining({
          trackingNumber: "CP123456789AU",
          carrierName: "Australia Post",
        }),
      ],
    })
  })

  it("rejects shipping estimates without destination proof fields", async () => {
    const res = createResponse()

    await shippingEstimatePOST(
      createRequest({
        items: [{ variantId: "var_123", quantity: 1 }],
        destination: { countryCode: "AU" },
      }) as never,
      res as never
    )

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      rates: [],
      error: "City, postal code, and country are required for shipping estimates",
    })
    expect(karrioFetchRates).not.toHaveBeenCalled()
  })

  it("returns shipping estimates for proved destination and variants", async () => {
    productGraph.mockResolvedValue({
      data: [{ id: "var_123", weight: 0.4 }],
    })
    karrioFetchRates.mockResolvedValue({
      rates: [
        {
          id: "rate_123",
          carrier_name: "Australia Post",
          service: "standard",
          total_charge: 12.34,
          currency: "AUD",
          transit_days: 3,
          estimated_delivery: "2026-05-12",
        },
      ],
    })
    const res = createResponse()

    await shippingEstimatePOST(
      createRequest({
        items: [{ variantId: "var_123", quantity: 2 }],
        destination: {
          city: "Hobart",
          postalCode: "7000",
          countryCode: "AU",
        },
      }) as never,
      res as never
    )

    expect(productGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "product_variant",
        filters: { id: ["var_123"] },
      })
    )
    expect(karrioFetchRates).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: expect.objectContaining({
          city: "Hobart",
          postal_code: "7000",
          country_code: "AU",
        }),
      })
    )
    expect(res.json).toHaveBeenCalledWith({
      rates: [
        expect.objectContaining({
          id: "rate_123",
          totalCharge: 1234,
        }),
      ],
    })
  })
})
