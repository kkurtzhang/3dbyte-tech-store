import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { KARRIO_MODULE } from "../../modules/karrio";
import type {
  KarrioAddress,
  KarrioParcel,
  KarrioRateResponse,
} from "../../modules/karrio/types";

type StepInput = {
  shipper: KarrioAddress;
  recipient: KarrioAddress;
  parcels: KarrioParcel[];
  carrier_ids?: string[];
};

export const fetchKarrioRatesStep = createStep(
  "fetch-karrio-rates",
  async (input: StepInput, { container }) => {
    const karrioService = container.resolve(KARRIO_MODULE);

    const rateResponse: KarrioRateResponse = await karrioService.fetchRates({
      shipper: input.shipper,
      recipient: input.recipient,
      parcels: input.parcels,
      carrier_ids: input.carrier_ids,
    });

    return new StepResponse(rateResponse);
  }
);
