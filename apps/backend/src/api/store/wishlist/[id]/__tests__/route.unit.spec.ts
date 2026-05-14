import { DELETE } from "../route"

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

describe("store wishlist item route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("deletes only wishlist rows owned by the authenticated customer", async () => {
    const wishlistModule = {
      listWishlists: jest.fn().mockResolvedValue([{ id: "wish_1" }]),
      deleteWishlists: jest.fn().mockResolvedValue(undefined),
    }
    const req = {
      auth_context: { actor_id: "cus_123" },
      params: { id: "wish_1" },
      scope: {
        resolve: jest.fn().mockReturnValue(wishlistModule),
      },
    }
    const res = createResponse()

    await DELETE(req as never, res as never)

    expect(req.scope.resolve).toHaveBeenCalledWith("wishlist")
    expect(wishlistModule.listWishlists).toHaveBeenCalledWith({
      id: "wish_1",
      customer_id: "cus_123",
    })
    expect(wishlistModule.deleteWishlists).toHaveBeenCalledWith("wish_1")
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("returns 404 when the wishlist row belongs to another customer", async () => {
    const wishlistModule = {
      listWishlists: jest.fn().mockResolvedValue([]),
      deleteWishlists: jest.fn(),
    }
    const req = {
      auth_context: { actor_id: "cus_123" },
      params: { id: "wish_other" },
      scope: {
        resolve: jest.fn().mockReturnValue(wishlistModule),
      },
    }
    const res = createResponse()

    await DELETE(req as never, res as never)

    expect(req.scope.resolve).toHaveBeenCalledWith("wishlist")
    expect(wishlistModule.deleteWishlists).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      message: "Wishlist item not found",
    })
  })
})
