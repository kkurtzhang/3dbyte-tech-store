import { DELETE } from "../route"

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

describe("store waitlist item route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("deletes only waitlist rows owned by the authenticated customer", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue([{ id: "wait_1" }]),
      deleteWaitlistEntries: jest.fn().mockResolvedValue(undefined),
    }
    const req = {
      auth_context: { actor_id: "cus_123" },
      params: { id: "wait_1" },
      scope: {
        resolve: jest.fn().mockReturnValue(waitlistModule),
      },
    }
    const res = createResponse()

    await DELETE(req as never, res as never)

    expect(req.scope.resolve).toHaveBeenCalledWith("waitlist")
    expect(waitlistModule.listWaitlistEntries).toHaveBeenCalledWith({
      id: "wait_1",
      customer_id: "cus_123",
    })
    expect(waitlistModule.deleteWaitlistEntries).toHaveBeenCalledWith("wait_1")
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("returns 404 when the waitlist row belongs to another customer", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue([]),
      deleteWaitlistEntries: jest.fn(),
    }
    const req = {
      auth_context: { actor_id: "cus_123" },
      params: { id: "wait_other" },
      scope: {
        resolve: jest.fn().mockReturnValue(waitlistModule),
      },
    }
    const res = createResponse()

    await DELETE(req as never, res as never)

    expect(req.scope.resolve).toHaveBeenCalledWith("waitlist")
    expect(waitlistModule.deleteWaitlistEntries).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      message: "Waitlist item not found",
    })
  })
})
