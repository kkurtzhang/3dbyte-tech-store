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

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getRateMetaString(rate: KarrioRate, key: string): string | undefined {
  return asTrimmedString(rate.meta?.[key]);
}

function getRateTextCandidates(rate: KarrioRate): string[] {
  return [
    rate.service,
    getRateMetaString(rate, "service"),
    getRateMetaString(rate, "service_code"),
    getRateMetaString(rate, "service_name"),
    getRateMetaString(rate, "carrier"),
    getRateMetaString(rate, "rate_provider"),
    rate.carrier_name,
    rate.carrier_id,
    ...(rate.extra_charges || []).map((charge) => charge.name),
  ].flatMap((value) => {
    const text = asTrimmedString(value);
    return text ? [text] : [];
  });
}

function candidateIncludes(rate: KarrioRate, needle: string): boolean {
  return getRateTextCandidates(rate).some((candidate) =>
    candidate.toLowerCase().includes(needle)
  );
}

function isAramexRate(rate: KarrioRate): boolean {
  return candidateIncludes(rate, "aramex");
}

function isPriorityRate(rate: KarrioRate): boolean {
  return (
    candidateIncludes(rate, "priority") || candidateIncludes(rate, "express")
  );
}

function getAramexServiceName(rate: KarrioRate): string {
  if (isAramexRate(rate)) {
    if (isPriorityRate(rate)) {
      return "Aramex Priority";
    }

    if (
      candidateIncludes(rate, "economy") ||
      candidateIncludes(rate, "standard") ||
      rate.carrier_name.toLowerCase() === "aramex_aunz"
    ) {
      return "Aramex Economy";
    }
  }

  return (
    getRateMetaString(rate, "service_name") ||
    asTrimmedString(rate.service) ||
    rate.carrier_name
  );
}

function getKarrioServiceCode(rate: KarrioRate): string {
  const explicitService =
    asTrimmedString(rate.service) ||
    getRateMetaString(rate, "service_code") ||
    getRateMetaString(rate, "service");

  if (explicitService) {
    return explicitService;
  }

  if (!isAramexRate(rate)) {
    return rate.carrier_name || rate.carrier_id || "shipping";
  }

  const baseService =
    getRateMetaString(rate, "carrier") ||
    getRateMetaString(rate, "rate_provider") ||
    rate.carrier_name ||
    rate.carrier_id ||
    "aramex_aunz";
  const normalizedBaseService = normalizeSlug(baseService) || "aramex_aunz";

  return isPriorityRate(rate)
    ? `${normalizedBaseService}_priority`
    : normalizedBaseService;
}

function getCarrierDisplayName(rate: KarrioRate): string {
  return isAramexRate(rate) ? "Aramex" : rate.carrier_name;
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
      res.json({
        rates: [],
        message: "Shipping address required for live rates",
      });
      return;
    }

    if (!hasRequiredRateAddress(shippingAddress as Record<string, unknown>)) {
      res.status(400).json({
        rates: [],
        message:
          "Shipping city, postal code, and country are required for live rates",
      });
      return;
    }

    const shipper = buildShipperAddress();
    const recipient = buildRecipientAddress(
      shippingAddress as unknown as Record<string, unknown>
    );
    const parcels = buildParcelsFromItems(
      (cart.items || []) as unknown as {
        variant?: { weight?: number };
        quantity?: number;
      }[]
    );

    const rateResponse = await karrioService.fetchRates({
      shipper,
      recipient,
      parcels,
      payment: { paid_by: "sender" },
    });

    const rates = rateResponse.rates.map((rate) => ({
      id: rate.id,
      carrier: {
        id: rate.carrier_id,
        name: getCarrierDisplayName(rate),
        slug: rate.carrier_name.toLowerCase().replace(/\s+/g, "-"),
      },
      service: getKarrioServiceCode(rate),
      serviceName: getAramexServiceName(rate),
      totalCharge: Math.round(rate.total_charge * 100),
      currency: rate.currency,
      estimatedDeliveryDays: rate.transit_days,
      estimatedDeliveryDate: rate.estimated_delivery,
      transitDays: rate.transit_days,
      metadata: rate.meta,
    }));

    res.json({
      rates,
      ...(rateResponse.messages?.length
        ? { messages: rateResponse.messages }
        : {}),
    });
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
