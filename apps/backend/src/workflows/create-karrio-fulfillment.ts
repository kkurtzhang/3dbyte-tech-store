import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { fetchKarrioRatesStep } from "./steps/fetch-karrio-rates";
import type {
  KarrioAddress,
  KarrioParcel,
  KarrioRate,
} from "../modules/karrio/types";

type WorkflowInput = {
  shipper: KarrioAddress;
  recipient: KarrioAddress;
  parcels: KarrioParcel[];
  carrier_ids?: string[];
};

export const createKarrioFulfillmentWorkflow = createWorkflow(
  "create-karrio-fulfillment",
  (input: WorkflowInput) => {
    const rateResponse = fetchKarrioRatesStep({
      shipper: input.shipper,
      recipient: input.recipient,
      parcels: input.parcels,
      carrier_ids: input.carrier_ids,
    });

    const selectedRate = transform({ rateResponse }, (data) => {
      const rates = data.rateResponse.rates ?? [];

      if (rates.length === 0) {
        return null;
      }

      const sorted = [...rates].sort(
        (a: KarrioRate, b: KarrioRate) => a.total_charge - b.total_charge
      );

      return sorted[0];
    });

    return new WorkflowResponse({
      rate: selectedRate,
      all_rates: rateResponse,
    });
  }
);
