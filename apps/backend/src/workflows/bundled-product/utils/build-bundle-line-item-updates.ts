import { MedusaError } from "@medusajs/framework/utils";

type CartLineItem = {
  id: string;
  quantity: number;
  metadata?: Record<string, unknown> | null;
};

function getBundleMetadata(item: CartLineItem) {
  const metadata = item.metadata ?? {};
  const bundleId =
    typeof metadata.bundle_key === "string"
      ? metadata.bundle_key
      : typeof metadata.bundle_id === "string"
        ? metadata.bundle_id
        : null;
  const bundleQuantity =
    typeof metadata.bundle_quantity === "number" && metadata.bundle_quantity > 0
      ? metadata.bundle_quantity
      : null;

  return {
    bundleId,
    bundleQuantity,
    metadata,
  };
}

export function buildBundleLineItemUpdates(
  items: Array<CartLineItem | null> | null | undefined,
  bundleId: string,
  nextBundleQuantity: number
) {
  const bundleItems = (items ?? []).filter((item): item is CartLineItem => {
    return item !== null && getBundleMetadata(item).bundleId === bundleId;
  });

  if (!bundleItems.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Bundle ${bundleId} was not found in the cart`
    );
  }

  return bundleItems.map((item) => {
    const { bundleQuantity, metadata } = getBundleMetadata(item);

    if (!bundleQuantity) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Bundle ${bundleId} is missing bundle quantity metadata`
      );
    }

    if (item.quantity % bundleQuantity !== 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Line item ${item.id} quantity is not aligned with bundle quantity`
      );
    }

    const perBundleQuantity = item.quantity / bundleQuantity;

    return {
      selector: {
        id: item.id,
      },
      data: {
        quantity: perBundleQuantity * nextBundleQuantity,
        metadata: {
          ...metadata,
          bundle_quantity: nextBundleQuantity,
        },
      },
    };
  });
}
