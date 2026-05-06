import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const lookupOrderFields = [
  "id",
  "email",
  "display_id",
  "custom_display_id",
  "status",
  "payment_status",
  "fulfillment_status",
  "currency_code",
  "created_at",
  "subtotal",
  "item_subtotal",
  "shipping_total",
  "shipping_subtotal",
  "tax_total",
  "discount_total",
  "total",
  "payment_collections.payments",
  "items",
  "items.metadata",
  "items.variant",
  "items.product",
  "items.variant.preorder_variant",
  "items.variant.preorder_variant.prices",
  "shipping_methods",
  "shipping_address",
];

const getQueryValue = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const reference = getQueryValue(req.query.reference);
  const email = getQueryValue(req.query.email).toLowerCase();

  if (!reference || !email) {
    res.status(400).json({ order: null });
    return;
  }

  const query = req.scope.resolve("query");
  const { data: orders } = await query.graph({
    entity: "order",
    fields: lookupOrderFields,
    filters: {
      custom_display_id: reference,
    },
  });

  const order = orders?.[0] as { email?: string | null } | undefined;

  if (!order || order.email?.toLowerCase() !== email) {
    res.status(404).json({ order: null });
    return;
  }

  res.json({ order });
};
