import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

type OrderPayment = {
  provider_id?: unknown;
  data?: unknown;
};

type OrderPaymentCollection = {
  payments?: OrderPayment[] | null;
};

type OrderWithPayments = {
  email?: string | null;
  payment_collections?: OrderPaymentCollection[] | null;
};

type SafePaymentMethod = {
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

export function toSafeStripePaymentMethod(value: unknown): SafePaymentMethod | null {
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

async function retrieveStripePaymentMethod(paymentMethodId: string) {
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
    }
  );

  if (!response.ok) {
    return null;
  }

  return toSafeStripePaymentMethod(await response.json());
}

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id } = req.params;
  const email = typeof req.query.email === "string" ? req.query.email : "";
  const query = req.scope.resolve("query");

  if (!email.trim()) {
    res.status(400).json({ payment_method: null });
    return;
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "email",
      "payment_collections.payments.provider_id",
      "payment_collections.payments.data",
    ],
    filters: {
      id,
    },
  });

  const order = orders?.[0] as OrderWithPayments | undefined;

  if (!order || order.email?.toLowerCase() !== email.trim().toLowerCase()) {
    res.status(404).json({ payment_method: null });
    return;
  }

  const paymentMethodId = extractPaymentMethodId(order);

  if (!paymentMethodId) {
    res.json({ payment_method: null });
    return;
  }

  try {
    res.json({
      payment_method: await retrieveStripePaymentMethod(paymentMethodId),
    });
  } catch {
    res.json({ payment_method: null });
  }
};
