import { Modules } from "@medusajs/framework/utils"

import { DELETE, GET, POST } from "../route"

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

function createRequest({
  actorId = "cus_123",
  body = {},
  waitlistModule,
  customerModule,
}: {
  actorId?: string | null
  body?: Record<string, unknown>
  waitlistModule: Record<string, jest.Mock>
  customerModule?: Record<string, jest.Mock>
}) {
  return {
    auth_context: actorId ? { actor_id: actorId } : undefined,
    body,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === "waitlist") {
          return waitlistModule
        }

        if (key === Modules.CUSTOMER) {
          return customerModule
        }

        throw new Error(`Unexpected module ${key}`)
      }),
    },
  }
}

const waitlistBody = {
  product_id: "prod_1",
  product_variant_id: "variant_1",
  product_handle: "test-product",
  product_title: "Test Product",
  variant_title: "Black - 180",
}

const waitlistBodyWithEmail = {
  ...waitlistBody,
  email: "  Ava@Example.COM  ",
}

describe("store waitlist route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("rejects unauthenticated customers", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn(),
      createWaitlistEntries: jest.fn(),
    }
    const req = createRequest({ actorId: null, waitlistModule })
    const res = createResponse()

    await GET(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" })
    expect(waitlistModule.listWaitlistEntries).not.toHaveBeenCalled()
  })

  it("allows guests to create waitlist rows with an email address", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue([]),
      createWaitlistEntries: jest.fn().mockResolvedValue({
        id: "wait_guest",
        customer_email: "ava@example.com",
      }),
    }
    const req = createRequest({
      actorId: null,
      waitlistModule,
      body: waitlistBodyWithEmail,
    })
    const res = createResponse()

    await POST(req as never, res as never)

    expect(waitlistModule.listWaitlistEntries).toHaveBeenCalledWith({
      customer_email: "ava@example.com",
      product_id: "prod_1",
      product_variant_id: "variant_1",
      notified: false,
    })
    expect(waitlistModule.createWaitlistEntries).toHaveBeenCalledWith({
      customer_id: null,
      customer_email: "ava@example.com",
      product_id: "prod_1",
      product_variant_id: "variant_1",
      product_handle: "test-product",
      product_title: "Test Product",
      variant_title: "Black - 180",
      notified: false,
      notification_count: 0,
    })
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it("rejects guest waitlist rows without a valid email", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn(),
      createWaitlistEntries: jest.fn(),
    }
    const req = createRequest({
      actorId: null,
      waitlistModule,
      body: { ...waitlistBody, email: "not-an-email" },
    })
    const res = createResponse()

    await POST(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: "A valid email is required",
    })
    expect(waitlistModule.createWaitlistEntries).not.toHaveBeenCalled()
  })

  it("lists waitlist rows for the authenticated customer", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "wait_1" }]),
      createWaitlistEntries: jest.fn(),
      updateWaitlistEntries: jest.fn(),
    }
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({ email: "ava@example.com" }),
    }
    const req = createRequest({ waitlistModule, customerModule })
    const res = createResponse()

    await GET(req as never, res as never)

    expect(req.scope.resolve).toHaveBeenCalledWith("waitlist")
    expect(waitlistModule.listWaitlistEntries).toHaveBeenNthCalledWith(2, {
      customer_id: "cus_123",
    })
    expect(res.json).toHaveBeenCalledWith({
      waitlist: [{ id: "wait_1" }],
      customer_email: "ava@example.com",
    })
  })

  it("reuses duplicate active waitlist rows for the same email, product, and variant", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue([
        {
          id: "wait_1",
          customer_email: "ava@example.com",
          customer_id: "cus_123",
        },
      ]),
      createWaitlistEntries: jest.fn(),
      updateWaitlistEntries: jest.fn(),
    }
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({ email: "ava@example.com" }),
    }
    const req = createRequest({
      waitlistModule,
      customerModule,
      body: waitlistBody,
    })
    const res = createResponse()

    await POST(req as never, res as never)

    expect(req.scope.resolve).toHaveBeenCalledWith("waitlist")
    expect(waitlistModule.listWaitlistEntries).toHaveBeenCalledWith({
      customer_email: "ava@example.com",
      product_id: "prod_1",
      product_variant_id: "variant_1",
      notified: false,
    })
    expect(waitlistModule.createWaitlistEntries).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      waitlist: expect.objectContaining({
        id: "wait_1",
        customer_email: "ava@example.com",
      }),
    })
  })

  it("creates waitlist rows with the authenticated customer's email", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue([]),
      createWaitlistEntries: jest.fn().mockResolvedValue({ id: "wait_1" }),
      updateWaitlistEntries: jest.fn(),
    }
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({ email: "ava@example.com" }),
    }
    const req = createRequest({
      waitlistModule,
      customerModule,
      body: waitlistBody,
    })
    const res = createResponse()

    await POST(req as never, res as never)

    expect(req.scope.resolve).toHaveBeenCalledWith(Modules.CUSTOMER)
    expect(customerModule.retrieveCustomer).toHaveBeenCalledWith("cus_123")
    expect(waitlistModule.createWaitlistEntries).toHaveBeenCalledWith({
      customer_id: "cus_123",
      customer_email: "ava@example.com",
      product_id: "prod_1",
      product_variant_id: "variant_1",
      product_handle: "test-product",
      product_title: "Test Product",
      variant_title: "Black - 180",
      notified: false,
      notification_count: 0,
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      waitlist: { id: "wait_1" },
    })
  })

  it("links existing guest rows when an authenticated customer with the same email reads waitlist data", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest
        .fn()
        .mockResolvedValueOnce([{ id: "wait_guest" }])
        .mockResolvedValueOnce([{ id: "wait_guest", customer_id: "cus_123" }]),
      updateWaitlistEntries: jest.fn().mockResolvedValue(undefined),
    }
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({ email: "Ava@Example.COM" }),
    }
    const req = createRequest({ waitlistModule, customerModule })
    const res = createResponse()

    await GET(req as never, res as never)

    expect(waitlistModule.listWaitlistEntries).toHaveBeenNthCalledWith(1, {
      customer_email: "ava@example.com",
      customer_id: null,
    })
    expect(waitlistModule.updateWaitlistEntries).toHaveBeenCalledWith([
      { id: "wait_guest", customer_id: "cus_123" },
    ])
    expect(waitlistModule.listWaitlistEntries).toHaveBeenNthCalledWith(2, {
      customer_id: "cus_123",
    })
    expect(res.json).toHaveBeenCalledWith({
      waitlist: [{ id: "wait_guest", customer_id: "cus_123" }],
      customer_email: "ava@example.com",
    })
  })

  it("clears only rows owned by the authenticated customer", async () => {
    const waitlistModule = {
      listWaitlistEntries: jest.fn().mockResolvedValue([
        { id: "wait_1" },
        { id: "wait_2" },
      ]),
      deleteWaitlistEntries: jest.fn().mockResolvedValue(undefined),
    }
    const req = createRequest({ waitlistModule })
    const res = createResponse()

    await DELETE(req as never, res as never)

    expect(waitlistModule.listWaitlistEntries).toHaveBeenCalledWith({
      customer_id: "cus_123",
    })
    expect(waitlistModule.deleteWaitlistEntries).toHaveBeenCalledWith([
      "wait_1",
      "wait_2",
    ])
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
