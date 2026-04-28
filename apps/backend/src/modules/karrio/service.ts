import { Logger } from "@medusajs/framework/types";
import { KarrioClient } from "./client";
import type {
  KarrioCarrier,
  KarrioModuleOptions,
  KarrioRateRequest,
  KarrioRateResponse,
  KarrioShipment,
  KarrioShipmentRequest,
  KarrioTracker,
  KarrioVoidResponse,
} from "./types";

type InjectedDependencies = {
  logger: Logger;
};

class KarrioModuleService {
  private readonly client: KarrioClient;
  private readonly logger: Logger;
  private readonly options: KarrioModuleOptions;

  constructor({ logger }: InjectedDependencies, options: KarrioModuleOptions) {
    this.logger = logger;
    this.options = options;
    this.client = new KarrioClient(options);
  }

  async fetchRates(request: KarrioRateRequest): Promise<KarrioRateResponse> {
    this.logger.debug(
      `Karrio: Fetching rates for ${request.recipient.country_code}`
    );
    return this.client.fetchRates(request);
  }

  async createShipment(
    request: KarrioShipmentRequest
  ): Promise<KarrioShipment> {
    this.logger.info(
      `Karrio: Creating shipment to ${request.recipient.country_code}`
    );
    return this.client.createShipment(request);
  }

  async getTracking(trackerId: string): Promise<KarrioTracker> {
    return this.client.getTracking(trackerId);
  }

  async createTracker(
    trackingNumber: string,
    carrierName: string
  ): Promise<KarrioTracker> {
    this.logger.info(
      `Karrio: Creating tracker for ${trackingNumber} (${carrierName})`
    );
    return this.client.createTracker(trackingNumber, carrierName);
  }

  async cancelShipment(shipmentId: string): Promise<KarrioVoidResponse> {
    this.logger.info(`Karrio: Cancelling shipment ${shipmentId}`);
    return this.client.cancelShipment(shipmentId);
  }

  async getCarriers(): Promise<KarrioCarrier[]> {
    return this.client.getCarriers();
  }

  isTestMode(): boolean {
    return this.options.testMode;
  }
}

export default KarrioModuleService;
