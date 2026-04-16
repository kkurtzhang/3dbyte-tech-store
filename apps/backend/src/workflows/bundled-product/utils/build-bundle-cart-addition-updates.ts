type CartLineItem = {
  id: string;
  quantity: number;
  variant_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type IncomingBundleLineItem = {
  variant_id: string;
  quantity: number;
  metadata?: Record<string, unknown> | null;
};

function getBundleKey(metadata: Record<string, unknown> | null | undefined) {
  if (typeof metadata?.bundle_key === "string") {
    return metadata.bundle_key;
  }

  if (typeof metadata?.bundle_id === "string") {
    return metadata.bundle_id;
  }

  return null;
}

function getBundleQuantity(
  item: CartLineItem,
  fallbackPerBundleQuantity: number
) {
  const metadataQuantity =
    typeof item.metadata?.bundle_quantity === "number" && item.metadata.bundle_quantity > 0
      ? item.metadata.bundle_quantity
      : null;

  if (metadataQuantity) {
    return metadataQuantity;
  }

  if (fallbackPerBundleQuantity > 0 && item.quantity % fallbackPerBundleQuantity === 0) {
    return item.quantity / fallbackPerBundleQuantity;
  }

  return 1;
}

export function buildBundleCartAdditionUpdates(
  existingItems: Array<CartLineItem | null> | null | undefined,
  incomingItems: IncomingBundleLineItem[]
) {
  const bundleKey = getBundleKey(incomingItems[0]?.metadata);
  const bundleId =
    typeof incomingItems[0]?.metadata?.bundle_id === "string"
      ? incomingItems[0].metadata.bundle_id
      : null;

  if (!bundleKey && !bundleId) {
    return null;
  }

  const existingBundleItems = (existingItems ?? []).filter((item): item is CartLineItem => {
    if (item === null) {
      return false;
    }

    const existingBundleKey = getBundleKey(item.metadata);
    const existingBundleId =
      typeof item.metadata?.bundle_id === "string" ? item.metadata.bundle_id : null;

    return existingBundleKey === bundleKey || (bundleId !== null && existingBundleId === bundleId);
  });

  if (!existingBundleItems.length) {
    return null;
  }

  const matchedItems = incomingItems.map((incomingItem) => {
    const incomingBundleItemId =
      typeof incomingItem.metadata?.bundle_item_id === "string"
        ? incomingItem.metadata.bundle_item_id
        : null;

    return existingBundleItems.find((existingItem) => {
      if (existingItem.variant_id !== incomingItem.variant_id) {
        return false;
      }

      if (!incomingBundleItemId) {
        return true;
      }

      return existingItem.metadata?.bundle_item_id === incomingBundleItemId;
    });
  });

  if (matchedItems.some((item) => !item)) {
    return null;
  }

  const referenceIncomingItem = incomingItems[0];
  const referenceMatchedItem = matchedItems[0]!;
  const perBundleQuantity =
    typeof referenceIncomingItem.metadata?.bundle_item_quantity === "number"
      ? referenceIncomingItem.metadata.bundle_item_quantity
      : referenceIncomingItem.quantity;
  const currentBundleQuantity = getBundleQuantity(
    referenceMatchedItem,
    perBundleQuantity
  );
  const incomingBundleQuantity =
    typeof referenceIncomingItem.metadata?.bundle_quantity === "number"
      ? referenceIncomingItem.metadata.bundle_quantity
      : 1;
  const nextBundleQuantity = currentBundleQuantity + incomingBundleQuantity;

  return incomingItems.map((incomingItem, index) => {
    const existingItem = matchedItems[index]!;

    return {
      selector: {
        id: existingItem.id,
      },
      data: {
        quantity: existingItem.quantity + incomingItem.quantity,
        metadata: {
          ...(existingItem.metadata ?? {}),
          ...(incomingItem.metadata ?? {}),
          bundle_quantity: nextBundleQuantity,
        },
      },
    };
  });
}
