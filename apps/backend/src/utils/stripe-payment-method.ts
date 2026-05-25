type OrderPayment = {
  provider_id?: unknown;
  data?: unknown;
};

type OrderPaymentCollection = {
  payments?: OrderPayment[] | null;
};

export type OrderWithPayments = {
  payment_collections?: OrderPaymentCollection[] | null;
};

export type SafeStripePaymentMethod = {
  type: "card";
  brand: string;
  last4: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStripeProvider(providerId: unknown) {
  return typeof providerId === "string" && providerId.includes("stripe");
}

export function extractPaymentMethodId(order: OrderWithPayments) {
  for (const collection of order.payment_collections ?? []) {
    for (const payment of collection.payments ?? []) {
      if (!isStripeProvider(payment.provider_id) || !isRecord(payment.data)) {
        continue;
      }

      const paymentMethod = payment.data.payment_method;

      if (typeof paymentMethod === "string" && paymentMethod.startsWith("pm_")) {
        return paymentMethod;
      }

      if (isRecord(paymentMethod) && typeof paymentMethod.id === "string") {
        return paymentMethod.id;
      }
    }
  }

  return null;
}

export function toSafeStripePaymentMethod(
  value: unknown,
): SafeStripePaymentMethod | null {
  if (!isRecord(value) || value.type !== "card" || !isRecord(value.card)) {
    return null;
  }

  const { brand, last4 } = value.card;

  if (typeof brand !== "string" || typeof last4 !== "string") {
    return null;
  }

  return {
    type: "card",
    brand,
    last4,
  };
}

export async function retrieveStripePaymentMethod(paymentMethodId: string) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return null;
  }

  const response = await fetch(
    `https://api.stripe.com/v1/payment_methods/${paymentMethodId}`,
    {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  return toSafeStripePaymentMethod(await response.json());
}
