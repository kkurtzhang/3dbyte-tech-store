import type { KarrioAddress, KarrioParcel } from "./types";

export const DEFAULT_WEIGHT_KG = 0.5;
export const DEFAULT_DIMENSION_CM = 10;

export function buildShipperAddress(): KarrioAddress {
  return {
    person_name: process.env.STORE_SHIPPER_NAME || "3D Byte Tech",
    address_line1: process.env.STORE_SHIPPER_ADDRESS || "",
    city: process.env.STORE_SHIPPER_CITY || "",
    state_code: process.env.STORE_SHIPPER_STATE || "",
    postal_code: process.env.STORE_SHIPPER_POSTAL || "",
    country_code: process.env.STORE_SHIPPER_COUNTRY || "AU",
    phone_number: process.env.STORE_SHIPPER_PHONE || "",
  };
}

export function buildRecipientAddress(
  address: Record<string, unknown>
): KarrioAddress {
  return {
    person_name:
      `${address.first_name || ""} ${address.last_name || ""}`.trim(),
    address_line1: (address.address_1 as string) || "",
    address_line2: (address.address_2 as string) || undefined,
    city: (address.city as string) || "",
    state_code: (address.province as string) || undefined,
    postal_code: (address.postal_code as string) || "",
    country_code: (address.country_code as string) || "",
    phone_number: (address.phone as string) || undefined,
  };
}

interface WeightedItem {
  variant?: { weight?: number } | Record<string, unknown>;
  quantity?: number;
}

export function buildParcelsFromItems(items: WeightedItem[]): KarrioParcel[] {
  const totalWeight = items.reduce((sum, item) => {
    const variant = item.variant as Record<string, unknown> | undefined;
    const weight = (variant?.weight as number) || DEFAULT_WEIGHT_KG;
    const quantity = item.quantity || 1;
    return sum + weight * quantity;
  }, 0);

  return [
    {
      weight: totalWeight || DEFAULT_WEIGHT_KG,
      weight_unit: "KG",
      width: DEFAULT_DIMENSION_CM,
      height: DEFAULT_DIMENSION_CM,
      length: DEFAULT_DIMENSION_CM,
      dimension_unit: "CM",
    },
  ];
}
