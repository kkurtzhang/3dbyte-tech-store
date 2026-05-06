import type {
  EmailRawAmount,
  OrderPlacedEmailItem,
  OrderPlacedEmailOrder,
  OrderPlacedEmailStore,
} from "./types";

const placeholderStoreNames = new Set(["", "medusa store"]);

const getValidAmount = (amount: number | null | undefined): number | null => {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return null;
  }

  return amount;
};

const getRawAmount = (amount?: EmailRawAmount | null): number | null => {
  const value = amount?.value;
  const numericValue =
    typeof value === "string" ? Number.parseFloat(value) : value;

  return getValidAmount(numericValue);
};

export const getCustomerStoreName = (store: OrderPlacedEmailStore): string => {
  const configuredName = process.env.ORDER_EMAIL_STORE_NAME || store.name || "";
  const normalizedName = configuredName.trim();

  return placeholderStoreNames.has(normalizedName.toLowerCase())
    ? "3D Byte Tech"
    : normalizedName;
};

export const getCustomerOrderNumber = (order: OrderPlacedEmailOrder): string =>
  order.custom_display_id?.trim() || `#${order.display_id}`;

export const getSummarySubtotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined =>
  order.item_subtotal ??
  getRawAmount(order.raw_item_subtotal) ??
  order.subtotal ??
  getRawAmount(order.raw_subtotal) ??
  order.item_total ??
  getRawAmount(order.raw_item_total);

export const getOrderShippingTotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined =>
  order.shipping_subtotal ??
  getRawAmount(order.raw_shipping_subtotal) ??
  order.shipping_total ??
  getRawAmount(order.raw_shipping_total);

export const getOrderTaxTotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined =>
  order.tax_total ?? getRawAmount(order.raw_tax_total);

export const getOrderTotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined => order.total ?? getRawAmount(order.raw_total);

export const getItemTitle = (item: OrderPlacedEmailItem): string =>
  item.product_title || item.title || "Product";

export const getItemVariantText = (item: OrderPlacedEmailItem): string | null =>
  item.variant_title && item.variant_title !== "Default Title"
    ? item.variant_title
    : null;

export const getItemQuantity = (item: OrderPlacedEmailItem): number => {
  const quantity = item.quantity ?? item.detail?.quantity;

  return typeof quantity === "number" && Number.isFinite(quantity)
    ? quantity
    : 0;
};

export const getItemLineTotal = (item: OrderPlacedEmailItem): number => {
  const explicitTotal =
    getValidAmount(item.subtotal) ??
    getValidAmount(item.item_subtotal) ??
    getRawAmount(item.raw_subtotal) ??
    getRawAmount(item.raw_item_subtotal) ??
    getValidAmount(item.total) ??
    getValidAmount(item.item_total) ??
    getRawAmount(item.raw_total) ??
    getRawAmount(item.raw_item_total);

  if (explicitTotal !== null) {
    return explicitTotal;
  }

  const unitPrice = getValidAmount(item.unit_price) ?? 0;

  return unitPrice * getItemQuantity(item);
};

export const getShippingMethodName = (
  order: OrderPlacedEmailOrder,
): string | null => {
  const method = order.shipping_methods?.find((shippingMethod) =>
    Boolean(shippingMethod.name?.trim()),
  );

  return method?.name?.trim() || null;
};
