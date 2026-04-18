import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { KARRIO_MODULE } from "../../../modules/karrio";
import type KarrioModuleService from "../../../modules/karrio/service";
import {
  buildShipperAddress,
  buildRecipientAddress,
  buildParcelsFromItems,
} from "../../../modules/karrio/utils";

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

    const shipper = buildShipperAddress();
    const recipient = buildRecipientAddress(shippingAddress);
    const parcels = buildParcelsFromItems(order.items || []);

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
