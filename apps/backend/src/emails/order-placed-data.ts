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

const isCloseMoney = (left: number, right: number): boolean =>
  Math.abs(left - right) < 0.01;

const getTaxInclusiveGraphTotals = (
  order: OrderPlacedEmailOrder,
):
  | {
      itemSubtotal: number;
      itemTotal: number;
      shippingSubtotal: number;
      shippingTotal: number;
      subtotal: number;
      taxTotal: number;
      total: number;
    }
  | null => {
  const graphSubtotal = getValidAmount(order.subtotal);
  const graphTotal = getValidAmount(order.total);
  const graphTaxTotal = getValidAmount(order.tax_total);

  if (
    graphSubtotal === null ||
    graphTotal === null ||
    graphTaxTotal === null ||
    graphTotal <= graphSubtotal ||
    !isCloseMoney(graphTotal - graphSubtotal, graphTaxTotal)
  ) {
    return null;
  }

  const discountTotal = getOrderDiscountTotal(order);
  const shippingTotal =
    getValidAmount(order.shipping_subtotal) ??
    getRawAmount(order.raw_shipping_subtotal) ??
    getValidAmount(order.shipping_total) ??
    getRawAmount(order.raw_shipping_total) ??
    0;
  const taxRate = graphSubtotal > 0 ? graphTaxTotal / graphSubtotal : 0;
  const taxTotal =
    taxRate > 0 ? graphSubtotal * (taxRate / (1 + taxRate)) : graphTaxTotal;
  const itemTotal = Math.max(0, graphSubtotal - shippingTotal + discountTotal);
  const itemSubtotal =
    taxRate > 0 ? itemTotal / (1 + taxRate) : itemTotal;
  const shippingSubtotal =
    taxRate > 0 ? shippingTotal / (1 + taxRate) : shippingTotal;

  return {
    itemSubtotal,
    itemTotal,
    shippingSubtotal,
    shippingTotal,
    subtotal: Math.max(0, graphSubtotal - taxTotal),
    taxTotal,
    total: graphSubtotal,
  };
};

export const getCustomerSummarySubtotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined => {
  const graphTotals = getTaxInclusiveGraphTotals(order);
  if (graphTotals) {
    return graphTotals.itemTotal;
  }

  const total = getOrderTotal(order);
  const shippingTotal = getOrderShippingTotal(order);

  if (
    total !== null &&
    total !== undefined &&
    shippingTotal !== null &&
    shippingTotal !== undefined
  ) {
    return Math.max(0, total - shippingTotal + getOrderDiscountTotal(order));
  }

  return getSummarySubtotal(order);
};

export const getOrderShippingTotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined => {
  const graphTotals = getTaxInclusiveGraphTotals(order);
  if (graphTotals) {
    return graphTotals.shippingTotal;
  }

  return (
    getValidAmount(order.shipping_total) ??
    getRawAmount(order.raw_shipping_total) ??
    getValidAmount(order.shipping_subtotal) ??
    getRawAmount(order.raw_shipping_subtotal)
  );
};

export const getOrderTaxTotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined => {
  const graphTotals = getTaxInclusiveGraphTotals(order);
  if (graphTotals) {
    return graphTotals.taxTotal;
  }

  return getValidAmount(order.tax_total) ?? getRawAmount(order.raw_tax_total);
};

export const getOrderTotal = (
  order: OrderPlacedEmailOrder,
): number | null | undefined => {
  const graphTotals = getTaxInclusiveGraphTotals(order);
  if (graphTotals) {
    return graphTotals.total;
  }

  return getValidAmount(order.total) ?? getRawAmount(order.raw_total);
};

export const getOrderDiscountTotal = (
  order: OrderPlacedEmailOrder,
): number => getValidAmount(order.discount_total) ?? 0;

export const getItemTitle = (item: OrderPlacedEmailItem): string =>
  item.product_title || item.title || "Product";

const isDefaultVariantText = (value: string): boolean => {
  const normalizedValue = value.replace(/\s+/g, " ").trim().toLowerCase();

  return (
    !normalizedValue ||
    normalizedValue === "default" ||
    normalizedValue === "default title" ||
    normalizedValue === "default variant" ||
    normalizedValue === "standard" ||
    normalizedValue.startsWith("default ")
  );
};

export const getItemVariantText = (item: OrderPlacedEmailItem): string | null =>
  item.variant_title && !isDefaultVariantText(item.variant_title)
    ? item.variant_title.trim()
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
