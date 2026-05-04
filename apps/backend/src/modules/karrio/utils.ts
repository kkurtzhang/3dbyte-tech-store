import type { KarrioAddress, KarrioParcel } from "./types";

export const DEFAULT_WEIGHT_KG = 0.5;
export const DEFAULT_DIMENSION_CM = 10;
export const DEFAULT_SHIPPER_ADDRESS = {
  person_name: "Kurt",
  company_name: "3D BYTE TECH",
  address_line1: "1 Bellevue Parade",
  city: "New Town",
  state_code: "TAS",
  postal_code: "7008",
  country_code: "AU",
  residential: false,
} as const;

export function normalizeAddressCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return normalized || undefined;
}

function numberFromVariant(
  variant: Record<string, unknown> | undefined,
  key: string,
  fallback: number
): number {
  const value = variant?.[key];
  return typeof value === "number" && value > 0 ? value : fallback;
}

function stringFromEnv(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized || fallback;
}

export function buildShipperAddress(): KarrioAddress {
  return {
    person_name: stringFromEnv(
      process.env.STORE_SHIPPER_NAME,
      DEFAULT_SHIPPER_ADDRESS.person_name
    ),
    company_name: stringFromEnv(
      process.env.STORE_SHIPPER_COMPANY,
      DEFAULT_SHIPPER_ADDRESS.company_name
    ),
    address_line1: stringFromEnv(
      process.env.STORE_SHIPPER_ADDRESS,
      DEFAULT_SHIPPER_ADDRESS.address_line1
    ),
    city: stringFromEnv(process.env.STORE_SHIPPER_CITY, DEFAULT_SHIPPER_ADDRESS.city),
    state_code:
      normalizeAddressCode(process.env.STORE_SHIPPER_STATE) ||
      DEFAULT_SHIPPER_ADDRESS.state_code,
    postal_code: stringFromEnv(
      process.env.STORE_SHIPPER_POSTAL,
      DEFAULT_SHIPPER_ADDRESS.postal_code
    ),
    country_code:
      normalizeAddressCode(process.env.STORE_SHIPPER_COUNTRY) ||
      DEFAULT_SHIPPER_ADDRESS.country_code,
    phone_number: process.env.STORE_SHIPPER_PHONE?.trim() || undefined,
    residential: false,
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
    state_code: normalizeAddressCode(address.province),
    postal_code: (address.postal_code as string) || "",
    country_code: normalizeAddressCode(address.country_code) || "",
    phone_number: (address.phone as string) || undefined,
    residential:
      typeof address.residential === "boolean" ? address.residential : true,
  };
}

interface WeightedItem {
  variant?: {
    weight?: number;
    width?: number;
    height?: number;
    length?: number;
  } | Record<string, unknown>;
  quantity?: number;
}

export function buildParcelsFromItems(items: WeightedItem[]): KarrioParcel[] {
  const totalWeight = items.reduce((sum, item) => {
    const variant = item.variant as Record<string, unknown> | undefined;
    const weight = (variant?.weight as number) || DEFAULT_WEIGHT_KG;
    const quantity = item.quantity || 1;
    return sum + weight * quantity;
  }, 0);
  const firstVariant = items[0]?.variant as Record<string, unknown> | undefined;

  return [
    {
      weight: totalWeight || DEFAULT_WEIGHT_KG,
      weight_unit: "KG",
      width: numberFromVariant(firstVariant, "width", DEFAULT_DIMENSION_CM),
      height: numberFromVariant(firstVariant, "height", DEFAULT_DIMENSION_CM),
      length: numberFromVariant(firstVariant, "length", DEFAULT_DIMENSION_CM),
      dimension_unit: "CM",
      is_document: false,
      packaging_type: "your_packaging",
    },
  ];
}
