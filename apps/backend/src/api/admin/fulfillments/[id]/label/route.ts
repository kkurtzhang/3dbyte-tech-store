import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import { KARRIO_MODULE } from "../../../../../modules/karrio";
import type KarrioModuleService from "../../../../../modules/karrio/service";
import {
  buildShipperAddress,
  normalizeAddressCode,
} from "../../../../../modules/karrio/utils";

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id } = req.params;
  const query = req.scope.resolve("query");
  const karrioService = req.scope.resolve<KarrioModuleService>(KARRIO_MODULE);

  try {
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: ["id", "data", "metadata", "items.*"],
      filters: { id },
    });

    if (!fulfillments || fulfillments.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Fulfillment not found"
      );
    }

    const fulfillment = fulfillments[0];
    const fulfillmentData = (fulfillment.data || {}) as Record<string, unknown>;

    if (fulfillmentData.label_url) {
      res.json({
        label_url: fulfillmentData.label_url,
        tracking_number: fulfillmentData.tracking_number,
        carrier_name: fulfillmentData.carrier_name,
      });
      return;
    }

    const shipment = await karrioService.createShipment({
      shipper: buildShipperAddress(),
      recipient: {
        person_name: (fulfillmentData.recipient_name as string) || "",
        address_line1: (fulfillmentData.recipient_address_1 as string) || "",
        city: (fulfillmentData.recipient_city as string) || "",
        postal_code: (fulfillmentData.recipient_postal_code as string) || "",
        country_code:
          normalizeAddressCode(fulfillmentData.recipient_country_code) || "",
        residential: true,
      },
      parcels: [
        {
          weight: 0.5,
          weight_unit: "KG",
          width: 10,
          height: 10,
          length: 10,
          dimension_unit: "CM",
          is_document: false,
          packaging_type: "your_packaging",
        },
      ],
      service: (fulfillmentData.service as string) || "",
      carrier_ids: fulfillmentData.carrier_id
        ? [fulfillmentData.carrier_id as string]
        : undefined,
      payment: { paid_by: "sender" },
      selected_rate_id: fulfillmentData.selected_rate_id as string | undefined,
      label_type: "PDF",
    });

    const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT);
    await (fulfillmentModule as any).updateFulfillment(id, {
      data: {
        ...fulfillmentData,
        karrio_shipment_id: shipment.id,
        tracking_number: shipment.tracking_number,
        label_url: shipment.label_url,
        tracking_url: shipment.tracking_url,
        carrier_name: shipment.carrier_name,
      },
    });

    res.json({
      shipment_id: shipment.id,
      tracking_number: shipment.tracking_number,
      label_url: shipment.label_url,
      tracking_url: shipment.tracking_url,
      carrier_name: shipment.carrier_name,
    });
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error;
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to purchase shipping label: ${error}`
    );
  }
};
