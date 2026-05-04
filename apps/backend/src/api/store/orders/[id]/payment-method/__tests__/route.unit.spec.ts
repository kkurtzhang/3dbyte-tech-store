const mockGraph = jest.fn();
const mockFetch = jest.fn();

global.fetch = mockFetch as unknown as typeof fetch;

import {
  GET,
  extractPaymentMethodId,
  toSafeStripePaymentMethod,
} from "../route";

describe("GET /store/orders/:id/payment-method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_safe";
  });

  it("extracts a payment method id from a stored Stripe payment intent", () => {
    expect(
      extractPaymentMethodId({
        payment_collections: [
          {
            payments: [
              {
                provider_id: "pp_stripe_stripe",
                data: {
                  payment_method: "pm_123",
                },
              },
            ],
          },
        ],
      })
    ).toBe("pm_123");
  });

  it("returns only safe card brand and last4 after the order email matches", async () => {
    mockGraph.mockResolvedValue({
      data: [
        {
          id: "order_123",
          email: "test@demo.com",
          payment_collections: [
            {
              payments: [
                {
                  provider_id: "pp_stripe_stripe",
                  data: {
                    payment_method: "pm_123",
                    client_secret: "pi_secret_should_not_return",
                  },
                },
              ],
            },
          ],
        },
      ],
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "pm_123",
        type: "card",
        card: {
          brand: "visa",
          last4: "4242",
          exp_month: 5,
          exp_year: 2029,
        },
      }),
    });

    const req = {
      params: { id: "order_123" },
      query: { email: "TEST@demo.com" },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await GET(req as never, res as never);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.stripe.com/v1/payment_methods/pm_123",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk_test_safe",
        }),
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      payment_method: {
        type: "card",
        brand: "visa",
        last4: "4242",
      },
    });
  });

  it("does not call Stripe when the email does not match", async () => {
    mockGraph.mockResolvedValue({
      data: [
        {
          id: "order_123",
          email: "owner@example.com",
          payment_collections: [],
        },
      ],
    });

    const req = {
      params: { id: "order_123" },
      query: { email: "other@example.com" },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph }),
      },
    };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await GET(req as never, res as never);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("safe Stripe payment method mapping", () => {
  it("drops raw Stripe ids and card expiry data", () => {
    expect(
      toSafeStripePaymentMethod({
        id: "pm_123",
        type: "card",
        card: {
          brand: "mastercard",
          last4: "4444",
          exp_month: 5,
          exp_year: 2029,
        },
      })
    ).toEqual({
      type: "card",
      brand: "mastercard",
      last4: "4444",
    });
  });
});
