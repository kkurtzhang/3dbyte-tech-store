import type { FulfillmentOption } from "@medusajs/framework/types";

export interface KarrioFulfillmentOption extends FulfillmentOption {
  id: string;
  name: string;
  carrier_id: string;
  carrier_name: string;
  service: string;
  service_name: string;
}

const DEFAULT_KARRIO_FULFILLMENT_OPTIONS: KarrioFulfillmentOption[] = [
  {
    id: "australiapost-parcel-post",
    name: "Australia Post Standard",
    carrier_id: "australiapost",
    carrier_name: "Australia Post",
    service: "australiapost_parcel_post",
    service_name: "Standard",
  },
  {
    id: "australiapost-express-post",
    name: "Australia Post Express",
    carrier_id: "australiapost",
    carrier_name: "Australia Post",
    service: "australiapost_express_post",
    service_name: "Express",
  },
  {
    id: "aramex-economy",
    name: "Aramex Economy",
    carrier_id: "aramex",
    carrier_name: "Aramex",
    service: "aramex_economy",
    service_name: "Economy",
  },
  {
    id: "aramex-priority",
    name: "Aramex Priority",
    carrier_id: "aramex",
    carrier_name: "Aramex",
    service: "aramex_priority",
    service_name: "Priority",
  },
];

function isKarrioFulfillmentOption(
  value: unknown,
): value is KarrioFulfillmentOption {
  if (!value || typeof value !== "object") {
    return false;
  }

  const option = value as Record<string, unknown>;

  return (
    typeof option.id === "string" &&
    typeof option.name === "string" &&
    typeof option.carrier_id === "string" &&
    typeof option.carrier_name === "string" &&
    typeof option.service === "string" &&
    typeof option.service_name === "string"
  );
}

export function getConfiguredKarrioFulfillmentOptions(
  value = process.env.KARRIO_FULFILLMENT_OPTIONS,
): KarrioFulfillmentOption[] {
  if (!value) {
    return DEFAULT_KARRIO_FULFILLMENT_OPTIONS;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed) || !parsed.every(isKarrioFulfillmentOption)) {
      return DEFAULT_KARRIO_FULFILLMENT_OPTIONS;
    }

    return parsed;
  } catch {
    return DEFAULT_KARRIO_FULFILLMENT_OPTIONS;
  }
}
