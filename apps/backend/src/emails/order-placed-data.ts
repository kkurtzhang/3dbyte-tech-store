import type {
  EmailRawAmount,
  OrderPlacedEmailItem,
  OrderPlacedEmailOrder,
  OrderPlacedEmailStore,
} from "./types";

const placeholderStoreNames = new Set(["", "medusa store"]);

const getRecordValue = (
  value: unknown,
  key: string,
): unknown | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return (value as Record<string, unknown>)[key] ?? null;
};

const getValidAmount = (amount: unknown): number | null => {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    if (typeof amount === "string") {
      const parsedValue = Number.parseFloat(amount);

      return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    if (!amount || typeof amount !== "object") {
      return null;
    }

    const numericAmount = getValidAmount(getRecordValue(amount, "numeric"));
    if (numericAmount !== null) {
      return numericAmount;
    }

    const rawAmount = getValidAmount(getRecordValue(amount, "raw"));
    if (rawAmount !== null) {
      return rawAmount;
    }

    const valueAmount = getValidAmount(getRecordValue(amount, "value"));
    if (valueAmount !== null) {
      return valueAmount;
    }

    const toJSON = getRecordValue(amount, "toJSON");
    if (typeof toJSON === "function") {
      const jsonAmount = getValidAmount(toJSON.call(amount));
      if (jsonAmount !== null) {
        return jsonAmount;
      }
    }

    const valueOf = getRecordValue(amount, "valueOf");
    if (typeof valueOf === "function") {
      const primitiveAmount = valueOf.call(amount);
      if (primitiveAmount !== amount) {
        return getValidAmount(primitiveAmount);
      }
    }

    return null;
  }

  return amount;
};

const getRawAmount = (amount?: EmailRawAmount | null): number | null => {
  return getValidAmount(amount);
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

const getOrderTrackingReference = (order: OrderPlacedEmailOrder): string =>
  order.custom_display_id?.trim() || order.id;

export const getOrderTrackingUrl = (order: OrderPlacedEmailOrder): string => {
  const baseUrl =
    process.env.ORDER_EMAIL_TRACKING_BASE_URL ||
    "https://store.3dbytetech.com.au/track-order";
  const url = new URL(baseUrl);

  if (url.pathname === "/") {
    url.pathname = "/track-order";
  }

  url.searchParams.set("reference", getOrderTrackingReference(order));

  return url.toString();
};

export const getSummarySubtotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined =>
  getValidAmount(order.item_subtotal) ??
  getRawAmount(order.raw_item_subtotal) ??
  getValidAmount(order.subtotal) ??
  getRawAmount(order.raw_subtotal) ??
  getValidAmount(order.item_total) ??
  getRawAmount(order.raw_item_total);

export const getOrderShippingTotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined =>
  getValidAmount(order.shipping_subtotal) ??
  getRawAmount(order.raw_shipping_subtotal) ??
  getValidAmount(order.shipping_total) ??
  getRawAmount(order.raw_shipping_total);

export const getOrderTaxTotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined =>
  getValidAmount(order.tax_total) ?? getRawAmount(order.raw_tax_total);

export const getOrderTotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined =>
  getValidAmount(order.total) ?? getRawAmount(order.raw_total);

export const getOrderDiscountTotal = (
  order: OrderPlacedEmailOrder,
): number => getValidAmount(order.discount_total) ?? 0;

export const getItemTitle = (item: OrderPlacedEmailItem): string =>
  item.product_title || item.title || "Product";

export const getItemVariantText = (item: OrderPlacedEmailItem): string | null =>
  item.variant_title && item.variant_title !== "Default Title"
    ? item.variant_title
    : null;

export const getItemQuantity = (item: OrderPlacedEmailItem): number => {
  const quantity =
    getValidAmount(item.quantity) ??
    getValidAmount(item.detail?.quantity) ??
    getRawAmount(item.raw_quantity) ??
    getRawAmount(item.detail?.raw_quantity);

  return quantity !== null ? quantity : 0;
};

const getItemExplicitLineTotal = (
  item: OrderPlacedEmailItem,
): number | null => {
  return (
    getValidAmount(item.subtotal) ??
    getValidAmount(item.item_subtotal) ??
    getRawAmount(item.raw_subtotal) ??
    getRawAmount(item.raw_item_subtotal) ??
    getValidAmount(item.total) ??
    getValidAmount(item.item_total) ??
    getRawAmount(item.raw_total) ??
    getRawAmount(item.raw_item_total)
  );
};

export const getItemLineTotal = (item: OrderPlacedEmailItem): number => {
  const explicitTotal = getItemExplicitLineTotal(item);

  if (explicitTotal !== null) {
    return explicitTotal;
  }

  const unitPrice = getItemUnitPrice(item);

  return unitPrice * getItemQuantity(item);
};

export const getItemUnitPrice = (item: OrderPlacedEmailItem): number => {
  const explicitUnitPrice = getValidAmount(item.unit_price);
  if (explicitUnitPrice !== null) {
    return explicitUnitPrice;
  }

  const quantity = getItemQuantity(item);

  return quantity > 0 ? (getItemExplicitLineTotal(item) ?? 0) / quantity : 0;
};

export const getItemReleaseDate = (
  item: OrderPlacedEmailItem,
): Date | null => {
  const preorderVariant = item.variant?.preorder_variant;
  const availableDate =
    preorderVariant?.available_date ??
    (typeof item.metadata?.preorder_available_date === "string"
      ? item.metadata.preorder_available_date
      : null);
  const status =
    preorderVariant?.status ??
    (typeof item.metadata?.preorder_status === "string"
      ? item.metadata.preorder_status
      : null);

  if (status !== "enabled" || !availableDate) {
    return null;
  }

  const releaseDate = new Date(availableDate);

  return Number.isNaN(releaseDate.getTime()) ? null : releaseDate;
};

const getPositiveNumber = (value: unknown): number | null => {
  const amount = getValidAmount(value);

  return amount !== null && amount > 0 ? amount : null;
};

const getBundleMetadata = (item: OrderPlacedEmailItem) => {
  const metadata = item.metadata;
  const bundleId =
    typeof metadata?.bundle_id === "string"
      ? metadata.bundle_id
      : typeof metadata?.bundle_key === "string"
        ? metadata.bundle_key
        : null;

  if (!bundleId) {
    return null;
  }

  return {
    bundleId,
    bundleTitle:
      typeof metadata?.bundle_title === "string" ? metadata.bundle_title : null,
    quantity: getPositiveNumber(metadata?.bundle_quantity) ?? 1,
  };
};

export type OrderPlacedEmailItemGroup =
  | {
      type: "item";
      item: OrderPlacedEmailItem;
    }
  | {
      type: "bundle";
      bundleId: string;
      bundleTitle: string | null;
      quantity: number;
      items: OrderPlacedEmailItem[];
    };

export const buildOrderPlacedEmailItemGroups = (
  items: OrderPlacedEmailItem[] | null | undefined,
): OrderPlacedEmailItemGroup[] => {
  const groups: OrderPlacedEmailItemGroup[] = [];
  const bundleIndexById = new Map<string, number>();

  for (const item of items ?? []) {
    const bundleMetadata = getBundleMetadata(item);

    if (!bundleMetadata) {
      groups.push({
        type: "item",
        item,
      });
      continue;
    }

    const existingIndex = bundleIndexById.get(bundleMetadata.bundleId);

    if (existingIndex !== undefined) {
      const existingGroup = groups[existingIndex];
      if (existingGroup?.type === "bundle") {
        groups[existingIndex] = {
          ...existingGroup,
          items: [...existingGroup.items, item],
        };
      }
      continue;
    }

    bundleIndexById.set(bundleMetadata.bundleId, groups.length);
    groups.push({
      type: "bundle",
      bundleId: bundleMetadata.bundleId,
      bundleTitle: bundleMetadata.bundleTitle,
      quantity: bundleMetadata.quantity,
      items: [item],
    });
  }

  return groups;
};

export const getShippingMethodName = (
  order: OrderPlacedEmailOrder,
): string | null => {
  const method = order.shipping_methods?.find((shippingMethod) =>
    Boolean(shippingMethod.name?.trim()),
  );

  return method?.name?.trim() || null;
};
