const mockRun = jest.fn();

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

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ POST } = require("../route"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("completes carts through the preorder workflow", async () => {
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
      scope: {},
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
  });
});
