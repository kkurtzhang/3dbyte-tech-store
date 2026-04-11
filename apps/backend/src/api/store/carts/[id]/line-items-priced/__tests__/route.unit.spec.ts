const mockRun = jest.fn();

let POST: typeof import("../route").POST;

describe("store priced line-item route", () => {
  beforeAll(() => {
    jest.resetModules();

    jest.doMock(
      "../../../../../../workflows/add-preorder-priced-item-to-cart",
      () => ({
        addPreorderPricedItemToCartWorkflow: jest.fn(() => ({
          run: mockRun,
        })),
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ POST } = require("../route"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds line items through the preorder-priced cart workflow", async () => {
    mockRun.mockResolvedValue({
      result: {
        cart: { id: "cart_1" },
      },
    });

    const res = {
      json: jest.fn(),
    };

    const req = {
      params: { id: "cart_1" },
      scope: {},
      validatedBody: {
        variant_id: "variant_1",
        quantity: 2,
      },
    };

    await POST(req as never, res as never);

    expect(mockRun).toHaveBeenCalledWith({
      input: {
        cart_id: "cart_1",
        item: {
          variant_id: "variant_1",
          quantity: 2,
        },
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      cart: { id: "cart_1" },
    });
  });
});
