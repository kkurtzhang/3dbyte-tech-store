import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { KARRIO_MODULE } from "../../../modules/karrio";
import type KarrioModuleService from "../../../modules/karrio/service";
import type { KarrioAddress, KarrioParcel } from "../../../modules/karrio/types";

const DEFAULT_WEIGHT_KG = 0.5;
const DEFAULT_DIMENSION_CM = 10;

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { cart_id } = req.body as { cart_id?: string };

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
    const shippingAddress = cart.shipping_address;

    if (!shippingAddress) {
      res.json({ rates: [], message: "Shipping address required for live rates" });
      return;
    }

    const shipper: KarrioAddress = {
      person_name: process.env.STORE_SHIPPER_NAME || "3D Byte Tech",
      address_line1: process.env.STORE_SHIPPER_ADDRESS || "",
      city: process.env.STORE_SHIPPER_CITY || "",
      state_code: process.env.STORE_SHIPPER_STATE || "",
      postal_code: process.env.STORE_SHIPPER_POSTAL || "",
      country_code: process.env.STORE_SHIPPER_COUNTRY || "AU",
    };

    const recipient: KarrioAddress = {
      person_name: `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim(),
      address_line1: shippingAddress.address_1 || "",
      address_line2: shippingAddress.address_2 || undefined,
      city: shippingAddress.city || "",
      state_code: shippingAddress.province || undefined,
      postal_code: shippingAddress.postal_code || "",
      country_code: shippingAddress.country_code || "",
      phone_number: shippingAddress.phone || undefined,
    };

    const totalWeight = (cart.items || []).reduce(
      (sum: number, item: Record<string, any>) => {
        const weight = item.variant?.weight || DEFAULT_WEIGHT_KG;
        return sum + weight * (item.quantity || 1);
      },
      0
    );

    const parcels: KarrioParcel[] = [
      {
        weight: totalWeight || DEFAULT_WEIGHT_KG,
        weight_unit: "KG",
        width: DEFAULT_DIMENSION_CM,
        height: DEFAULT_DIMENSION_CM,
        length: DEFAULT_DIMENSION_CM,
        dimension_unit: "CM",
      },
    ];

    const rateResponse = await karrioService.fetchRates({
      shipper,
      recipient,
      parcels,
    });

    const rates = rateResponse.rates.map((rate) => ({
      id: rate.id,
      carrier: {
        id: rate.carrier_id,
        name: rate.carrier_name,
        slug: rate.carrier_name.toLowerCase().replace(/\s+/g, "-"),
      },
      service: rate.service,
      serviceName: rate.service,
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
