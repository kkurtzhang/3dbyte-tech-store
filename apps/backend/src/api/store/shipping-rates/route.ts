import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { KARRIO_MODULE } from "../../../modules/karrio";
import type KarrioModuleService from "../../../modules/karrio/service";
import {
  buildShipperAddress,
  buildRecipientAddress,
  buildParcelsFromItems,
} from "../../../modules/karrio/utils";
import type { KarrioRate } from "../../../modules/karrio/types";

interface ShippingRatesRequestBody {
  cart_id?: string;
  shipping_address?: Record<string, unknown>;
}

function getAramexServiceName(rate: KarrioRate): string {
  const serviceName =
    typeof rate.meta?.service_name === "string"
      ? rate.meta.service_name
      : rate.service;
  const normalizedService = serviceName.toLowerCase();

  if (
    rate.carrier_name.includes("aramex") ||
    rate.carrier_id.includes("aramex")
  ) {
    if (normalizedService.includes("priority")) {
      return "Aramex Priority";
    }

    if (normalizedService.includes("economy")) {
      return "Aramex Economy";
    }
  }

  return serviceName;
}

export function hasRequiredRateAddress(
  address: Record<string, unknown> | undefined
): address is Record<string, unknown> {
  return Boolean(
    address &&
      typeof address.city === "string" &&
      address.city.trim() &&
      typeof address.postal_code === "string" &&
      address.postal_code.trim() &&
      typeof address.country_code === "string" &&
      address.country_code.trim()
  );
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { cart_id, shipping_address } = req.body as ShippingRatesRequestBody;

  if (!cart_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "cart_id is required"
    );
  }

  const query = req.scope.resolve("query");
  const karrioService = req.scope.resolve<KarrioModuleService>(KARRIO_MODULE);

  try {
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "items.*",
        "items.variant.*",
        "shipping_address.*",
        "region.*",
      ],
      filters: { id: cart_id },
    });

    if (!carts || carts.length === 0) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found");
    }

    const cart = carts[0];
    const shippingAddress = shipping_address || cart.shipping_address;

    if (!shippingAddress) {
      res.json({ rates: [], message: "Shipping address required for live rates" });
      return;
    }

    if (!hasRequiredRateAddress(shippingAddress as Record<string, unknown>)) {
      res.status(400).json({
        rates: [],
        message: "Shipping city, postal code, and country are required for live rates",
      });
      return;
    }

    const shipper = buildShipperAddress();
    const recipient = buildRecipientAddress(shippingAddress as unknown as Record<string, unknown>);
    const parcels = buildParcelsFromItems((cart.items || []) as unknown as { variant?: { weight?: number }; quantity?: number }[]);

    const rateResponse = await karrioService.fetchRates({
      shipper,
      recipient,
      parcels,
    });

    const rates = rateResponse.rates.map((rate) => ({
      id: rate.id,
      carrier: {
        id: rate.carrier_id,
        name: rate.carrier_name.includes("aramex") ? "Aramex" : rate.carrier_name,
        slug: rate.carrier_name.toLowerCase().replace(/\s+/g, "-"),
      },
      service: rate.service,
      serviceName: getAramexServiceName(rate),
      totalCharge: Math.round(rate.total_charge * 100),
      currency: rate.currency,
      estimatedDeliveryDays: rate.transit_days,
      estimatedDeliveryDate: rate.estimated_delivery,
      transitDays: rate.transit_days,
      metadata: rate.meta,
    }));

    res.json({ rates });
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error;
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to fetch shipping rates: ${error}`
    );
  }
};
