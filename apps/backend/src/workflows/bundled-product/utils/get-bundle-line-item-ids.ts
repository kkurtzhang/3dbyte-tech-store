type CartLineItem = {
  id: string;
  metadata?: Record<string, unknown> | null;
};

export function getBundleLineItemIds(
  items: Array<CartLineItem | null> | null | undefined,
  bundleId: string
) {
  return (items ?? [])
    .filter((item): item is CartLineItem => item !== null)
    .filter((item) => {
      const key =
        typeof item.metadata?.bundle_key === "string"
          ? item.metadata.bundle_key
          : item.metadata?.bundle_id;

      return key === bundleId;
    })
    .map((item) => item.id);
}
