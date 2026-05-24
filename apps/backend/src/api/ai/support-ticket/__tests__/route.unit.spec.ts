import { POST } from "../route"

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

function createRequest({
  body,
  token,
  supportTicketModule,
}: {
  body: Record<string, unknown>
  token?: string
  supportTicketModule: Record<string, jest.Mock>
}) {
  return {
    body,
    get: jest.fn((name: string) =>
      name.toLowerCase() === "x-3db-internal-token" ? token : undefined
    ),
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === "supportTicket") return supportTicketModule
        if (key === "notification") {
          return { createNotifications: jest.fn().mockResolvedValue({}) }
        }
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

describe("POST /ai/support-ticket", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.INTERNAL_API_TOKEN = "internal-token"
  })

  it("rejects requests without the internal AI token", async () => {
    const supportTicketModule = {
      createSupportTickets: jest.fn(),
      createSupportTicketMessages: jest.fn(),
      createSupportTicketEvents: jest.fn(),
    }
    const req = createRequest({
      body: {},
      supportTicketModule,
    })
    const res = createResponse()

    await POST(req as never, res as never)

    expect(supportTicketModule.createSupportTickets).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("creates an ai_chat ticket with summary and consented transcript context", async () => {
    const supportTicketModule = {
      createSupportTickets: jest.fn().mockResolvedValue({
        id: "spt_ai_1",
        ticket_number: "3DBS-AI11-222222",
        status: "new",
        customer_email: "customer@example.com",
        customer_name: "Ava Customer",
        subject: "Compatibility question",
        category: "product_support",
        priority: "normal",
        source: "ai_chat",
        created_at: "2026-05-20T00:00:00.000Z",
      }),
      createSupportTicketMessages: jest.fn().mockResolvedValue({ id: "msg_1" }),
      createSupportTicketEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const req = createRequest({
      token: "internal-token",
      supportTicketModule,
      body: {
        name: "Ava Customer",
        email: "customer@example.com",
        subject: "Compatibility question",
        category: "product_support",
        message: "Please have a human check this compatibility question.",
        ai_summary: "Customer asked whether a hotend fits a Voron build.",
        transcript_excerpt: "Customer: will this fit?",
        consent_to_include_transcript: true,
        verified_order_context: { order_reference: "3DBO-ABCD-234567" },
      },
    })
    const res = createResponse()

    await POST(req as never, res as never)

    expect(supportTicketModule.createSupportTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "ai_chat",
        ai_summary: "Customer asked whether a hotend fits a Voron build.",
        metadata: expect.objectContaining({
          transcript_excerpt: "Customer: will this fit?",
          verified_order_context: { order_reference: "3DBO-ABCD-234567" },
        }),
      })
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })
})
