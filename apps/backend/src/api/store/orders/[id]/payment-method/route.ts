import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import {
  extractPaymentMethodId,
  retrieveStripePaymentMethod,
  toSafeStripePaymentMethod,
  type OrderWithPayments as PaymentOrderWithPayments,
} from "../../../../../utils/stripe-payment-method";

type OrderWithPayments = {
  email?: string | null;
} & PaymentOrderWithPayments;

export { extractPaymentMethodId, toSafeStripePaymentMethod };

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
