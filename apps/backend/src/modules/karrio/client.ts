import { MedusaError } from "@medusajs/framework/utils";
import type {
  KarrioAddress,
  KarrioCarrier,
  KarrioModuleOptions,
  KarrioRateRequest,
  KarrioRateResponse,
  KarrioShipment,
  KarrioShipmentRequest,
  KarrioTracker,
  KarrioVoidResponse,
} from "./types";
import { normalizeAddressCode } from "./utils";

const REQUEST_TIMEOUT_MS = 15_000;

export class KarrioClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly testMode: boolean;

  constructor(options: KarrioModuleOptions) {
    this.baseUrl = options.apiUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.testMode = options.testMode;
  }

  async fetchRates(request: KarrioRateRequest): Promise<KarrioRateResponse> {
    return this.request<KarrioRateResponse>(
      "POST",
      "/v1/proxy/rates",
      this.normalizeRateRequest(request)
    );
  }

  async createShipment(
    request: KarrioShipmentRequest
  ): Promise<KarrioShipment> {
    const normalizedRequest = this.normalizeShipmentRequest(request);
    if (normalizedRequest.selected_rate_id) {
      return this.request<KarrioShipment>(
        "POST",
        "/v1/proxy/shipments",
        this.normalizeSelectedRateShipmentRequest(normalizedRequest)
      );
    }

    return this.request<KarrioShipment>("POST", "/v1/shipments", normalizedRequest);
  }

  async getTracking(trackerId: string): Promise<KarrioTracker> {
    return this.request<KarrioTracker>("GET", `/v1/trackers/${trackerId}`);
  }

  async createTracker(
    trackingNumber: string,
    carrierName: string
  ): Promise<KarrioTracker> {
    return this.request<KarrioTracker>("POST", "/v1/trackers", {
      tracking_number: trackingNumber,
      carrier_name: carrierName,
    });
  }

  async cancelShipment(shipmentId: string): Promise<KarrioVoidResponse> {
    return this.request<KarrioVoidResponse>(
      "POST",
      `/v1/shipments/${shipmentId}/cancel`
    );
  }

  async getCarriers(): Promise<KarrioCarrier[]> {
    const response = await this.request<{ results: KarrioCarrier[] }>(
      "GET",
      "/v1/carriers"
    );
    return response.results;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Karrio API error (${response.status}): ${errorBody}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof MedusaError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Karrio API request timed out after ${REQUEST_TIMEOUT_MS}ms`
        );
      }

      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Karrio API request failed: ${error}`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private normalizeAddress(address: KarrioAddress): KarrioAddress {
    return {
      ...address,
      country_code: normalizeAddressCode(address.country_code) || "",
      state_code: normalizeAddressCode(address.state_code),
    };
  }

  private normalizeRateRequest(request: KarrioRateRequest): KarrioRateRequest {
    return {
      ...request,
      shipper: this.normalizeAddress(request.shipper),
      recipient: this.normalizeAddress(request.recipient),
      parcels: request.parcels.map((parcel) => ({ ...parcel })),
    };
  }

  private normalizeShipmentRequest(
    request: KarrioShipmentRequest
  ): KarrioShipmentRequest {
    return {
      ...request,
      selected_rate_id: request.selected_rate_id?.trim() || undefined,
      shipper: this.normalizeAddress(request.shipper),
      recipient: this.normalizeAddress(request.recipient),
      parcels: request.parcels.map((parcel) => ({ ...parcel })),
      references: request.references?.map((reference) => reference.trim()).filter(Boolean),
    };
  }

  private normalizeSelectedRateShipmentRequest(
    request: KarrioShipmentRequest
  ): Record<string, unknown> {
    return {
      selected_rate_id: request.selected_rate_id,
      ...(request.label_type ? { label_type: request.label_type } : {}),
      ...(request.references?.length ? { references: [...request.references] } : {}),
      ...(request.metadata ? { metadata: { ...request.metadata } } : {}),
    };
  }
}
