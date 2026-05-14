import { GET, POST } from "../route"

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

function createRequest({
  actorId = "cus_123",
  body = {},
  wishlistModule,
}: {
  actorId?: string | null
  body?: Record<string, unknown>
  wishlistModule: Record<string, jest.Mock>
}) {
  return {
    auth_context: actorId ? { actor_id: actorId } : undefined,
    body,
    scope: {
      resolve: jest.fn().mockReturnValue(wishlistModule),
    },
  }
}

describe("store wishlist route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("rejects unauthenticated customers", async () => {
    const wishlistModule = {
      listWishlists: jest.fn(),
      createWishlists: jest.fn(),
    }
    const req = createRequest({ actorId: null, wishlistModule })
    const res = createResponse()

    await GET(req as never, res as never)

    expect(req.scope.resolve).toHaveBeenCalledWith("wishlist")
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" })
    expect(wishlistModule.listWishlists).not.toHaveBeenCalled()
  })

  it("lists wishlist rows for the authenticated customer", async () => {
    const wishlistModule = {
      listWishlists: jest.fn().mockResolvedValue([{ id: "wish_1" }]),
      createWishlists: jest.fn(),
    }
    const req = createRequest({ wishlistModule })
    const res = createResponse()

    await GET(req as never, res as never)

    expect(req.scope.resolve).toHaveBeenCalledWith("wishlist")
    expect(wishlistModule.listWishlists).toHaveBeenCalledWith({
      customer_id: "cus_123",
    })
    expect(res.json).toHaveBeenCalledWith({
      wishlist: [{ id: "wish_1" }],
    })
  })

  it("prevents duplicate wishlist rows for the same product and variant", async () => {
    const wishlistModule = {
      listWishlists: jest.fn().mockResolvedValue([{ id: "wish_1" }]),
      createWishlists: jest.fn(),
    }
    const req = createRequest({
      wishlistModule,
      body: {
        product_id: "prod_1",
        product_variant_id: "variant_1",
      },
    })
    const res = createResponse()

    await POST(req as never, res as never)

    expect(req.scope.resolve).toHaveBeenCalledWith("wishlist")
    expect(wishlistModule.listWishlists).toHaveBeenCalledWith({
      customer_id: "cus_123",
      product_id: "prod_1",
      product_variant_id: "variant_1",
    })
    expect(wishlistModule.createWishlists).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: "Product already in wishlist",
    })
  })

  it("creates wishlist rows for the authenticated customer", async () => {
    const wishlistModule = {
      listWishlists: jest.fn().mockResolvedValue([]),
      createWishlists: jest.fn().mockResolvedValue({ id: "wish_1" }),
    }
    const req = createRequest({
      wishlistModule,
      body: {
        product_id: "prod_1",
        product_variant_id: "variant_1",
      },
    })
    const res = createResponse()

    await POST(req as never, res as never)

    expect(req.scope.resolve).toHaveBeenCalledWith("wishlist")
    expect(wishlistModule.createWishlists).toHaveBeenCalledWith({
      customer_id: "cus_123",
      product_id: "prod_1",
      product_variant_id: "variant_1",
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      wishlist: { id: "wish_1" },
    })
  })
})
