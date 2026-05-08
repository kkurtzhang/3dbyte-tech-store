import { getSafePaymentMethodDisplay } from "./index";

describe("Shared Utils", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });

  it("formats verified tracking payment card details safely", () => {
    expect(
      getSafePaymentMethodDisplay({
        payment_status: "authorized",
        tracking_payment_method: {
          type: "card",
          brand: "visa",
          last4: "4242",
        },
      }),
    ).toBe("Visa ending in 4242");
  });

  it("extracts Stripe card details without exposing raw identifiers", () => {
    const display = getSafePaymentMethodDisplay({
      payment_status: "authorized",
      payment_collections: [
        {
          payments: [
            {
              provider_id: "stripe",
              data: {
                payment_intent: "pi_should_not_render",
                payment_method_details: {
                  card: {
                    brand: "mastercard",
                    last4: "4444",
                  },
                },
              },
            },
          ],
        },
      ],
    });

    expect(display).toBe("Mastercard ending in 4444");
    expect(display).not.toContain("pi_should_not_render");
  });

  it("falls back to card payment for Stripe payments without safe card details", () => {
    expect(
      getSafePaymentMethodDisplay({
        payment_status: "authorized",
        payment_collections: [
          {
            payments: [
              {
                provider_id: "pp_stripe_stripe",
                data: {
                  payment_method: "pm_should_not_render",
                },
              },
            ],
          },
        ],
      }),
    ).toBe("Card payment");
  });

  it("falls back to humanized payment status", () => {
    expect(
      getSafePaymentMethodDisplay({
        payment_status: "partially_refunded",
      }),
    ).toBe("Partially Refunded");
  });
});
