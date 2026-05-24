import { POST } from "../route"

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
  }
}

function createRequest({
  body,
  supportTicketModule,
  notificationModule,
}: {
  body: Record<string, unknown>
  supportTicketModule: Record<string, jest.Mock>
  notificationModule?: Record<string, jest.Mock>
}) {
  return {
    body,
    get: jest.fn((name: string) =>
      name.toLowerCase() === "x-forwarded-for" ? "203.0.113.10" : undefined
    ),
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === "supportTicket") return supportTicketModule
        if (key === "notification") return notificationModule
        if (key === "emailSettings") {
          return {
            getResolvedSenderProfile: jest.fn().mockResolvedValue({
              from: "3D Byte Tech <no-reply@3dbytetech.com.au>",
              reply_to: "support@3dbytetech.com.au",
            }),
          }
        }
        throw new Error(`Unexpected module ${key}`)
      }),
    },
  }
}

const createdTicket = {
  id: "spt_1",
  ticket_number: "3DBS-ABCD-234567",
  status: "new",
  customer_email: "customer@example.com",
  customer_name: "Ava Customer",
  subject: "Need help with my order",
  category: "order_status",
  priority: "normal",
  source: "contact_form",
  created_at: "2026-05-20T00:00:00.000Z",
}

describe("POST /store/support-tickets", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.SUPPORT_TICKET_INBOX_EMAIL = "support@3dbytetech.com.au"
  })

  it("creates a ticket, first customer message, event, and notifications", async () => {
    const supportTicketModule = {
      createSupportTickets: jest.fn().mockResolvedValue(createdTicket),
      createSupportTicketMessages: jest.fn().mockResolvedValue({ id: "msg_1" }),
      createSupportTicketEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue({ id: "notif_1" }),
    }
    const req = createRequest({
      body: {
        name: " Ava Customer ",
        email: " CUSTOMER@example.com ",
        subject: " Need help with my order ",
        category: "order_status",
        message: "Can you check the shipping status?",
        order_reference: "3DBO-ABCD-234567",
        source: "contact_form",
      },
      supportTicketModule,
      notificationModule,
    })
    const res = createResponse()

    await POST(req as never, res as never)

    expect(supportTicketModule.createSupportTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: "customer@example.com",
        customer_name: "Ava Customer",
        status: "new",
        priority: "normal",
        category: "order_status",
        source: "contact_form",
      })
    )
    expect(supportTicketModule.createSupportTicketMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: "spt_1",
        author_type: "customer",
        direction: "inbound",
        visibility: "customer",
      })
    )
    expect(supportTicketModule.createSupportTicketEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: "spt_1",
        type: "created",
      })
    )
    expect(notificationModule.createNotifications).toHaveBeenCalledTimes(2)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      ticket: expect.objectContaining({
        id: "spt_1",
        ticket_number: "3DBS-ABCD-234567",
        status: "new",
      }),
    })
  })

  it("rejects invalid customer email before creating records", async () => {
    const supportTicketModule = {
      createSupportTickets: jest.fn(),
      createSupportTicketMessages: jest.fn(),
      createSupportTicketEvents: jest.fn(),
    }
    const req = createRequest({
      body: {
        name: "Ava",
        email: "not-an-email",
        subject: "Help",
        message: "Please help",
      },
      supportTicketModule,
    })
    const res = createResponse()

    await POST(req as never, res as never)

    expect(supportTicketModule.createSupportTickets).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: "A valid email is required",
    })
  })
})
