import { GET as getTickets } from "../route"
import { GET as getTicket } from "../[id]/route"
import { POST as addMessage } from "../[id]/messages/route"
import { POST as updateStatus } from "../[id]/status/route"

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

function createRequest({
  body = {},
  params = {},
  query = {},
  supportTicketModule,
}: {
  body?: Record<string, unknown>
  params?: Record<string, string>
  query?: Record<string, unknown>
  supportTicketModule: Record<string, jest.Mock>
}) {
  return {
    body,
    params,
    query,
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

const ticket = {
  id: "spt_1",
  ticket_number: "3DBS-ABCD-234567",
  status: "new",
  priority: "normal",
  category: "order_status",
  source: "contact_form",
  customer_email: "customer@example.com",
  customer_name: "Ava Customer",
  subject: "Need help",
  created_at: "2026-05-20T00:00:00.000Z",
}

describe("admin support ticket routes", () => {
  it("lists support tickets with pagination metadata", async () => {
    const supportTicketModule = {
      listSupportTickets: jest.fn().mockResolvedValue([ticket]),
    }
    const req = createRequest({
      query: { status: "new", limit: "10", offset: "0" },
      supportTicketModule,
    })
    const res = createResponse()

    await getTickets(req as never, res as never)

    expect(res.json).toHaveBeenCalledWith({
      tickets: [ticket],
      count: 1,
      limit: 10,
      offset: 0,
    })
  })

  it("returns ticket detail with messages and events", async () => {
    const supportTicketModule = {
      listSupportTickets: jest.fn().mockResolvedValue([ticket]),
      listSupportTicketMessages: jest.fn().mockResolvedValue([{ id: "msg_1" }]),
      listSupportTicketEvents: jest.fn().mockResolvedValue([{ id: "evt_1" }]),
    }
    const req = createRequest({
      params: { id: "spt_1" },
      supportTicketModule,
    })
    const res = createResponse()

    await getTicket(req as never, res as never)

    expect(res.json).toHaveBeenCalledWith({
      ticket,
      messages: [{ id: "msg_1" }],
      events: [{ id: "evt_1" }],
    })
  })

  it("updates ticket status and records an event", async () => {
    const supportTicketModule = {
      listSupportTickets: jest.fn().mockResolvedValue([ticket]),
      updateSupportTickets: jest.fn().mockResolvedValue({
        ...ticket,
        status: "open",
      }),
      createSupportTicketEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const req = createRequest({
      params: { id: "spt_1" },
      body: { status: "open" },
      supportTicketModule,
    })
    const res = createResponse()

    await updateStatus(req as never, res as never)

    expect(supportTicketModule.updateSupportTickets).toHaveBeenCalledWith({
      id: "spt_1",
      status: "open",
    })
    expect(supportTicketModule.createSupportTicketEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: "spt_1",
        type: "status_changed",
        from_value: "new",
        to_value: "open",
      })
    )
  })

  it("adds an internal note without sending a customer reply", async () => {
    const supportTicketModule = {
      listSupportTickets: jest.fn().mockResolvedValue([ticket]),
      createSupportTicketMessages: jest.fn().mockResolvedValue({
        id: "msg_internal",
        visibility: "internal",
      }),
      createSupportTicketEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const req = createRequest({
      params: { id: "spt_1" },
      body: { body: "Check carrier before replying.", visibility: "internal" },
      supportTicketModule,
    })
    const res = createResponse()

    await addMessage(req as never, res as never)

    expect(supportTicketModule.createSupportTicketMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: "spt_1",
        author_type: "admin",
        direction: "internal",
        visibility: "internal",
      })
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })
})
