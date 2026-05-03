const mockRun = jest.fn();
const mockUpdateProductsRun = jest.fn();

let POST: typeof import("../route").POST;

describe("store complete-preorder route", () => {
  beforeAll(() => {
    jest.resetModules();

    jest.doMock(
      "../../../../../../workflows/complete-cart-preorder",
      () => ({
        completeCartPreorderWorkflow: jest.fn(() => ({
          run: mockRun,
        })),
      })
    );
    jest.doMock("@medusajs/medusa/core-flows", () => ({
      updateProductsWorkflow: jest.fn(() => ({
        run: mockUpdateProductsRun,
      })),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ POST } = require("../route"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("completes carts through the preorder workflow", async () => {
    const query = {
      graph: jest.fn().mockResolvedValue({
        data: [
          {
            id: "cart_1",
            items: [],
          },
        ],
      }),
    };
    const fulfillmentModuleService = {
      listShippingProfiles: jest.fn(),
    };

    mockRun.mockResolvedValue({
      result: {
        order: { id: "order_1" },
      },
    });

    const res = {
      json: jest.fn(),
    };

    const req = {
      params: { id: "cart_1" },
      scope: {
        resolve: jest.fn((key) => {
          if (key === "query") {
            return query;
          }
          if (key === "fulfillment") {
            return fulfillmentModuleService;
          }
          return undefined;
        }),
      },
    };

    await POST(req as never, res as never);

    expect(mockRun).toHaveBeenCalledWith({
      input: {
        cart_id: "cart_1",
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      type: "order",
      order: { id: "order_1" },
    });
    expect(mockUpdateProductsRun).not.toHaveBeenCalled();
  });

  it("repairs missing product shipping profiles before completing the cart", async () => {
    const query = {
      graph: jest.fn().mockResolvedValue({
        data: [
          {
            id: "cart_1",
            items: [
              {
                requires_shipping: true,
                variant: {
                  product: {
                    id: "prod_missing_profile",
                    shipping_profile: null,
                  },
                },
              },
              {
                requires_shipping: true,
                variant: {
                  product: {
                    id: "prod_with_profile",
                    shipping_profile: { id: "sp_existing" },
                  },
                },
              },
            ],
          },
        ],
      }),
    };
    const fulfillmentModuleService = {
      listShippingProfiles: jest.fn().mockResolvedValue([
        { id: "sp_default", type: "default" },
      ]),
    };

    mockRun.mockResolvedValue({
      result: {
        order: { id: "order_1" },
      },
    });
    mockUpdateProductsRun.mockResolvedValue({
      result: [{ id: "prod_missing_profile" }],
    });

    const res = {
      json: jest.fn(),
    };

    const req = {
      params: { id: "cart_1" },
      scope: {
        resolve: jest.fn((key) => {
          if (key === "query") {
            return query;
          }
          if (key === "fulfillment") {
            return fulfillmentModuleService;
          }
          return undefined;
        }),
      },
    };

    await POST(req as never, res as never);

    expect(fulfillmentModuleService.listShippingProfiles).toHaveBeenCalledWith({
      type: "default",
    });
    expect(mockUpdateProductsRun).toHaveBeenCalledWith({
      input: {
        products: [
          {
            id: "prod_missing_profile",
            shipping_profile_id: "sp_default",
          },
        ],
      },
    });
    expect(mockRun).toHaveBeenCalledWith({
      input: {
        cart_id: "cart_1",
      },
    });
  });
});
