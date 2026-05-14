import { GET as getDemand } from "../demand/route"
import { GET as exportCsv } from "../export.csv/route"
import { GET as getEntries } from "../entries/route"
import { POST as sendTest } from "../test/route"

jest.mock("../../../../emails/renderers/waitlist-back-in-stock", () => ({
  renderWaitlistBackInStockEmail: jest.fn().mockResolvedValue({
    html: "<p>Ready</p>",
    subject: "Back in stock",
    text: "Ready",
  }),
}))

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    send: jest.fn(),
    json: jest.fn(),
  }
}

function createRequest({
  query = {},
  body = {},
  waitlistModule,
  notificationModule,
}: {
  query?: Record<string, unknown>
  body?: Record<string, unknown>
  waitlistModule: Record<string, jest.Mock>
  notificationModule?: Record<string, jest.Mock>
}) {
  return {
    query,
    body,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === "waitlist") {
          return waitlistModule
        }
        if (key === "notification") {
          return notificationModule
        }
        throw new Error(`Unexpected module ${key}`)
      }),
    },
  }
}

const rows = [
  {
    id: "wait_1",
    customer_email: "ava@example.com",
    customer_id: null,
    product_id: "prod_1",
    product_variant_id: "variant_1",
    product_handle: "test-product",
    product_title: "Test Product",
    variant_title: "Black - 180",
    notified: false,
    notification_count: 0,
    created_at: "2026-05-13T00:00:00.000Z",
  },
  {
    id: "wait_2",
    customer_email: "bea@example.com",
    customer_id: "cus_2",
    product_id: "prod_1",
    product_variant_id: "variant_1",
    product_handle: "test-product",
    product_title: "Test Product",
    variant_title: "Black - 180",
    notified: true,
    notification_count: 1,
    created_at: "2026-05-12T00:00:00.000Z",
  },
]

describe("admin waitlist routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.WAITLIST_LINK_SECRET = "test-secret"
    process.env.STOREFRONT_URL = "https://store.example.com"
  })

  it("returns product demand grouped by product and variant", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue(rows),
    }
    const req = createRequest({ waitlistModule })
    const res = createResponse()

    await getDemand(req as never, res as never)

    expect(res.json).toHaveBeenCalledWith({
      demand: [
        expect.objectContaining({
          product_id: "prod_1",
          product_variant_id: "variant_1",
          queued_count: 1,
          notified_count: 1,
          total_count: 2,
        }),
      ],
    })
  })

  it("returns queued subscriber entries with pagination metadata", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue(rows),
    }
    const req = createRequest({
      query: { status: "queued", limit: "10", offset: "0" },
      waitlistModule,
    })
    const res = createResponse()

    await getEntries(req as never, res as never)

    expect(res.json).toHaveBeenCalledWith({
      entries: [rows[0]],
      count: 1,
      limit: 10,
      offset: 0,
    })
  })

  it("exports the current filtered subscribers as CSV", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue(rows),
    }
    const req = createRequest({ query: { status: "queued" }, waitlistModule })
    const res = createResponse()

    await exportCsv(req as never, res as never)

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv")
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      "attachment; filename=\"waitlist-export.csv\""
    )
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("ava@example.com"))
    expect(res.send).toHaveBeenCalledWith(
      expect.not.stringContaining("bea@example.com")
    )
  })

  it("sends manual test notifications without mutating waitlist rows", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue([rows[0]]),
      updateWaitlistEntries: jest.fn(),
    }
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue({ id: "notif_1" }),
    }
    const req = createRequest({
      body: { waitlist_id: "wait_1", email: "owner@example.com" },
      waitlistModule,
      notificationModule,
    })
    const res = createResponse()

    await sendTest(req as never, res as never)

    expect(notificationModule.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        template: "waitlist-back-in-stock",
      })
    )
    expect(waitlistModule.updateWaitlistEntries).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
