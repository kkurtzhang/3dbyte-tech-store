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
  const { order_id } = req.body as { order_id?: string };

  if (!order_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "order_id is required"
    );
  }

  const query = req.scope.resolve("query");
  const karrioService = req.scope.resolve<KarrioModuleService>(KARRIO_MODULE);

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "items.*",
        "items.variant.*",
        "shipping_address.*",
        "region.*",
      ],
      filters: { id: order_id },
    });

    if (!orders || orders.length === 0) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found");
    }

    const order = orders[0];
    const shippingAddress = order.shipping_address;

    if (!shippingAddress) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order has no shipping address"
      );
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
    };

    const totalWeight = (order.items || []).reduce(
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
      carrier_id: rate.carrier_id,
      carrier_name: rate.carrier_name,
      service: rate.service,
      total_charge: rate.total_charge,
      currency: rate.currency,
      transit_days: rate.transit_days,
      estimated_delivery: rate.estimated_delivery,
    }));

    res.json({ rates });
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error;
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to fetch admin shipping rates: ${error}`
    );
  }
};
