import { POST as markNotified } from "../mark-notified/route"
import { POST as resend } from "../resend/route"

jest.mock("../../../../../emails/renderers/waitlist-back-in-stock", () => ({
  renderWaitlistBackInStockEmail: jest.fn().mockResolvedValue({
    html: "<p>Ready</p>",
    subject: "Back in stock",
    text: "Ready",
  }),
}))

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

function createRequest({
  emailSettingsModule,
  waitlistModule,
  notificationModule,
}: {
  emailSettingsModule?: Record<string, jest.Mock>
  waitlistModule: Record<string, jest.Mock>
  notificationModule?: Record<string, jest.Mock>
}) {
  return {
    params: { id: "wait_1" },
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === "waitlist") {
          return waitlistModule
        }
        if (key === "notification") {
          return notificationModule
        }
        if (key === "emailSettings") {
          return emailSettingsModule
        }
        throw new Error(`Unexpected module ${key}`)
      }),
    },
  }
}

const row = {
  id: "wait_1",
  customer_email: "ava@example.com",
  product_id: "prod_1",
  product_variant_id: "variant_1",
  product_handle: "test-product",
  product_title: "Test Product",
  variant_title: "Black - 180",
  notified: false,
  notification_count: 0,
}

describe("admin waitlist item routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(new Date("2026-05-13T00:00:00.000Z"))
    process.env.WAITLIST_LINK_SECRET = "test-secret"
    process.env.STOREFRONT_URL = "https://store.example.com"
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("marks a waitlist row as notified", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue([row]),
      updateWaitlistEntries: jest.fn().mockResolvedValue({
        ...row,
        notified: true,
      }),
    }
    const req = createRequest({ waitlistModule })
    const res = createResponse()

    await markNotified(req as never, res as never)

    expect(waitlistModule.updateWaitlistEntries).toHaveBeenCalledWith({
      id: "wait_1",
      notified: true,
      notified_at: "2026-05-13T00:00:00.000Z",
      last_notified_at: "2026-05-13T00:00:00.000Z",
      notification_count: 1,
    })
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("resends and marks a waitlist row as notified", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue([row]),
      updateWaitlistEntries: jest.fn().mockResolvedValue({
        ...row,
        notified: true,
      }),
    }
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue({ id: "notif_1" }),
    }
    const emailSettingsModule = {
      getResolvedSenderProfile: jest.fn().mockResolvedValue({
        key: "stock",
        from: "3D Byte Tech Stock Alerts <stock@3dbytetech.com.au>",
        reply_to: "support@3dbytetech.com.au",
      }),
    }
    const req = createRequest({
      emailSettingsModule,
      waitlistModule,
      notificationModule,
    })
    const res = createResponse()

    await resend(req as never, res as never)

    expect(notificationModule.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ava@example.com",
        from: "3D Byte Tech Stock Alerts <stock@3dbytetech.com.au>",
        provider_data: {
          reply_to: "support@3dbytetech.com.au",
        },
        template: "waitlist-back-in-stock",
        idempotency_key: "waitlist-back-in-stock/wait_1/1",
      })
    )
    expect(waitlistModule.updateWaitlistEntries).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
