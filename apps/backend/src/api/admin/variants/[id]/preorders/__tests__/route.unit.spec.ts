const mockUpsertRun = jest.fn();
const mockDisableRun = jest.fn();

let POST: typeof import("../route").POST;
let DELETE: typeof import("../route").DELETE;

describe("admin preorder routes", () => {
  beforeAll(() => {
    jest.resetModules();

    jest.doMock(
      "../../../../../../workflows/upsert-product-variant-preorder",
      () => ({
        upsertProductVariantPreorderWorkflow: jest.fn(() => ({
          run: mockUpsertRun,
        })),
      })
    );

    jest.doMock(
      "../../../../../../workflows/disable-preorder-variant",
      () => ({
        disablePreorderVariantWorkflow: jest.fn(() => ({
          run: mockDisableRun,
        })),
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ POST, DELETE } = require("../route"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("upserts preorder variants", async () => {
    mockUpsertRun.mockResolvedValue({
      result: {
        id: "pre_1",
        variant_id: "variant_1",
        prices: [
          { currency_code: "aud", amount: 139 },
          { currency_code: "nzd", amount: 149 },
        ],
      },
    });

    const res = {
      json: jest.fn(),
    };

    const req = {
      params: { id: "variant_1" },
      scope: {},
      validatedBody: {
        available_date: "2026-04-01T00:00:00.000Z",
        prices: [
          { currency_code: "aud", amount: 139 },
          { currency_code: "nzd", amount: 149 },
        ],
      },
    };

    await POST(req as never, res as never);

    expect(mockUpsertRun).toHaveBeenCalledWith({
      input: {
        variant_id: "variant_1",
        available_date: new Date("2026-04-01T00:00:00.000Z"),
        prices: [
          { currency_code: "aud", amount: 139 },
          { currency_code: "nzd", amount: 149 },
        ],
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      preorder_variant: {
        id: "pre_1",
        variant_id: "variant_1",
        prices: [
          { currency_code: "aud", amount: 139 },
          { currency_code: "nzd", amount: 149 },
        ],
      },
    });
  });

  it("disables preorder variants", async () => {
    mockDisableRun.mockResolvedValue({
      result: { id: "pre_1", status: "disabled" },
    });

    const res = {
      json: jest.fn(),
    };

    const req = {
      params: { id: "variant_1" },
      scope: {},
    };

    await DELETE(req as never, res as never);

    expect(mockDisableRun).toHaveBeenCalledWith({
      input: {
        variant_id: "variant_1",
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      preorder_variant: { id: "pre_1", status: "disabled" },
    });
  });
});
