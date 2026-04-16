type CartLineItem = {
  id: string;
  quantity: number;
  variant_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

function normalizeMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return {};
  }

  return metadata;
}

function metadataMatches(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined
) {
  const normalizedExisting = normalizeMetadata(existing);
  const normalizedIncoming = normalizeMetadata(incoming);

  return JSON.stringify(normalizedExisting) === JSON.stringify(normalizedIncoming);
}

export function findMatchingCartLineItem(
  items: Array<CartLineItem | null> | null | undefined,
  variantId: string,
  metadata?: Record<string, unknown> | null
) {
  return (items ?? [])
    .filter((item): item is CartLineItem => item !== null)
    .find((item) => {
      return item.variant_id === variantId && metadataMatches(item.metadata, metadata);
    });
}
