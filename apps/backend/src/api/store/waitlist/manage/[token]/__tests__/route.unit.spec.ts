import { createWaitlistManageToken } from "../../../../../../lib/waitlist/tokens"
import { DELETE, GET } from "../route"

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

const originalSecret = process.env.WAITLIST_LINK_SECRET

describe("store waitlist manage token route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.WAITLIST_LINK_SECRET = "test-waitlist-secret"
  })

  afterAll(() => {
    process.env.WAITLIST_LINK_SECRET = originalSecret
  })

  it("returns a waitlist row for a valid manage token", async () => {
    const token = createWaitlistManageToken({
      email: "ava@example.com",
      secret: "test-waitlist-secret",
      waitlistId: "wait_1",
    })
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue([{ id: "wait_1" }]),
    }
    const req = {
      params: { token },
      scope: {
        resolve: jest.fn().mockReturnValue(waitlistModule),
      },
    }
    const res = createResponse()

    await GET(req as never, res as never)

    expect(waitlistModule.listWaitlistEntries).toHaveBeenCalledWith({
      id: "wait_1",
      customer_email: "ava@example.com",
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      waitlist: { id: "wait_1" },
    })
  })

  it("removes a waitlist row for a valid manage token", async () => {
    const token = createWaitlistManageToken({
      email: "ava@example.com",
      secret: "test-waitlist-secret",
      waitlistId: "wait_1",
    })
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue([{ id: "wait_1" }]),
      deleteWaitlistEntries: jest.fn().mockResolvedValue(undefined),
    }
    const req = {
      params: { token },
      scope: {
        resolve: jest.fn().mockReturnValue(waitlistModule),
      },
    }
    const res = createResponse()

    await DELETE(req as never, res as never)

    expect(waitlistModule.deleteWaitlistEntries).toHaveBeenCalledWith("wait_1")
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("rejects invalid manage tokens", async () => {
    const req = {
      params: { token: "bad-token" },
      scope: {
        resolve: jest.fn(),
      },
    }
    const res = createResponse()

    await DELETE(req as never, res as never)

    expect(req.scope.resolve).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      message: "Waitlist item not found",
    })
  })
})
