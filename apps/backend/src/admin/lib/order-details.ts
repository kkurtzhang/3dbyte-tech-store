type OrderLineItem = {
  id?: string | null;
  title?: string | null;
  product_title?: string | null;
  quantity?: number | null;
  variant_sku?: string | null;
  metadata?: Record<string, unknown> | null;
  variant?: {
    sku?: string | null;
    preorder_variant?: {
      status?: string | null;
      available_date?: string | Date | null;
    } | null;
  } | null;
};

type OrderShippingMethod = {
  name?: string | null;
  data?: Record<string, unknown> | null;
};

type AdminOrderDetailsLike = {
  items?: OrderLineItem[] | null;
  shipping_methods?: OrderShippingMethod[] | null;
};

export type AdminOrderPreorderItem = {
  id: string;
  title: string;
  sku: string | null;
  quantity: number;
  availableDate: string;
};

export type AdminOrderBundleGroup = {
  bundleId: string;
  title: string;
  quantity: number;
  items: Array<{
    id: string;
    title: string;
    sku: string | null;
    quantity: number;
  }>;
};

const displayDateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Australia/Hobart",
});

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getPositiveNumber(value: unknown) {
  if (typeof value === "number" && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value);
    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      return parsedValue;
    }
  }

  return null;
}

function getItemTitle(item: OrderLineItem) {
  return item.title || item.product_title || "Order item";
}

function getItemSku(item: OrderLineItem) {
  return getString(item.variant_sku) ?? getString(item.variant?.sku);
}

export function getAdminOrderPreorderItems(
  order: AdminOrderDetailsLike
): AdminOrderPreorderItem[] {
  return (order.items ?? []).flatMap((item) => {
    const preorderVariant = item.variant?.preorder_variant;
    const metadata = item.metadata ?? {};
    const metadataAvailableDate = getString(metadata.preorder_available_date);
    const availableDate = preorderVariant?.available_date || metadataAvailableDate
      ? new Date(preorderVariant?.available_date ?? metadataAvailableDate!)
      : null;
    const preorderStatus = preorderVariant?.status ?? getString(metadata.preorder_status);

    if (
      preorderStatus !== "enabled" ||
      !availableDate ||
      Number.isNaN(availableDate.getTime())
    ) {
      return [];
    }

    return [
      {
        id: item.id || `${getItemTitle(item)}-${availableDate.toISOString()}`,
        title: getItemTitle(item),
        sku: getItemSku(item),
        quantity: item.quantity ?? 0,
        availableDate: displayDateFormatter.format(availableDate),
      },
    ];
  });
}

export function buildAdminOrderBundleGroups(
  order: AdminOrderDetailsLike
): AdminOrderBundleGroup[] {
  const groups: AdminOrderBundleGroup[] = [];
  const groupIndexById = new Map<string, number>();

  for (const item of order.items ?? []) {
    const metadata = item.metadata ?? {};
    const bundleId = getString(metadata.bundle_key) ?? getString(metadata.bundle_id);

    if (!bundleId) {
      continue;
    }

    const existingIndex = groupIndexById.get(bundleId);
    const displayItem = {
      id: item.id || `${bundleId}-${groups.length}`,
      title: getItemTitle(item),
      sku: getItemSku(item),
      quantity: item.quantity ?? 0,
    };

    if (existingIndex !== undefined) {
      groups[existingIndex] = {
        ...groups[existingIndex],
        items: [...groups[existingIndex].items, displayItem],
      };
      continue;
    }

    groupIndexById.set(bundleId, groups.length);
    groups.push({
      bundleId,
      title: getString(metadata.bundle_title) ?? "Bundled product",
      quantity: getPositiveNumber(metadata.bundle_quantity) ?? 1,
      items: [displayItem],
    });
  }

  return groups;
}

export function getAdminOrderShippingDisplayName(
  order: AdminOrderDetailsLike
): string | null {
  const shippingMethod = order.shipping_methods?.[0];
  if (!shippingMethod) {
    return null;
  }

  const carrierName = getString(shippingMethod.data?.carrier_name);
  const serviceName = getString(shippingMethod.data?.service_name);
  if (carrierName && serviceName) {
    return serviceName.toLowerCase().includes(carrierName.toLowerCase())
      ? serviceName
      : `${carrierName} ${serviceName}`;
  }

  return (
    getString(shippingMethod.data?.service_name) ??
    getString(shippingMethod.data?.service) ??
    getString(shippingMethod.name)
  );
}
