import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils";
import { MedusaError } from "@medusajs/framework/utils";
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  Logger,
} from "@medusajs/framework/types";
import { KarrioClient } from "../karrio/client";
import {
  buildParcelsFromItems,
  buildShipperAddress,
  normalizeAddressCode,
} from "../karrio/utils";
import type {
  KarrioAddress,
  KarrioModuleOptions,
  KarrioParcel,
  KarrioRate,
} from "../karrio/types";
import { getConfiguredKarrioFulfillmentOptions } from "./options";

type InjectedDependencies = {
  logger: Logger;
};

class KarrioFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "karrio";

  private readonly client: KarrioClient;
  private readonly logger: Logger;

  constructor({ logger }: InjectedDependencies, options: KarrioModuleOptions) {
    super();
    this.logger = logger;
    this.client = new KarrioClient(options);
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    const configuredOptions = getConfiguredKarrioFulfillmentOptions();

    try {
      const carriers = await this.client.getCarriers();
      const activeCarrierIds = new Set(
        carriers
          .filter((carrier) => carrier.active)
          .map((carrier) => carrier.carrier_id),
      );
      const activeOptions = configuredOptions.filter((option) =>
        activeCarrierIds.has(option.carrier_id),
      );

      if (activeOptions.length > 0) {
        return activeOptions;
      }

      this.logger.warn(
        "Karrio: No configured fulfillment options matched active carriers; using configured options.",
      );
      return configuredOptions;
    } catch (error) {
      this.logger.warn(
        `Karrio: Failed to fetch carriers, using configured options: ${error}`,
      );
      return configuredOptions;
    }
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return { ...optionData, ...data };
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return true;
  }

  async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
    return true;
  }

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"],
  ): Promise<CalculatedShippingOptionPrice> {
    const shippingAddress = context.shipping_address;
    if (!shippingAddress) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Shipping address is required to calculate Karrio rates",
      );
    }

    try {
      const shipper = this.buildShipperAddress(context.from_location as any);
      const recipient = this.buildRecipientAddress(
        shippingAddress as unknown as Record<string, unknown>,
      );
      const parcels = this.buildParcels(
        (context.items || []) as unknown as Array<
          Partial<Record<string, unknown>>
        >,
      );

      const carrierIds = optionData.carrier_id
        ? [optionData.carrier_id as string]
        : undefined;
      const services = optionData.service
        ? [optionData.service as string]
        : undefined;

      const rateResponse = await this.client.fetchRates({
        shipper,
        recipient,
        parcels,
        carrier_ids: carrierIds,
        services,
        payment: { paid_by: "sender" },
      });

      const rate = this.selectRateForOption(
        rateResponse.rates,
        optionData,
        data,
      );
      if (!rate) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "No Karrio rates are available for this address",
        );
      }

      return {
        calculated_amount: Number(rate.total_charge.toFixed(2)),
        is_calculated_price_tax_inclusive: false,
      };
    } catch (error) {
      this.logger.warn(`Karrio: Price calculation failed: ${error}`);
      throw error;
    }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<
      Omit<FulfillmentDTO, "provider_id" | "data" | "items">
    >,
  ): Promise<CreateFulfillmentResult> {
    try {
      const shippingAddress = (order as Record<string, unknown>)
        ?.shipping_address as Record<string, unknown> | undefined;
      if (!shippingAddress) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Shipping address is required to create a Karrio fulfillment",
        );
      }

      const recipient: KarrioAddress = {
        person_name:
          `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim(),
        address_line1: (shippingAddress.address_1 as string) || "",
        address_line2: (shippingAddress.address_2 as string) || undefined,
        city: (shippingAddress.city as string) || "",
        state_code: normalizeAddressCode(shippingAddress.province),
        postal_code: (shippingAddress.postal_code as string) || "",
        country_code: normalizeAddressCode(shippingAddress.country_code) || "",
        phone_number: (shippingAddress.phone as string) || undefined,
        residential:
          typeof shippingAddress.residential === "boolean"
            ? shippingAddress.residential
            : true,
      };

      const parcels = this.buildParcels(items);
      const service =
        (data.service as string) || (data.carrier_name as string) || "";
      const carrierIds = data.carrier_id
        ? [data.carrier_id as string]
        : undefined;

      const shipment = await this.client.createShipment({
        shipper: this.buildDefaultShipperAddress(),
        recipient,
        parcels,
        service,
        carrier_ids: carrierIds,
        payment: { paid_by: "sender" },
        label_type: "PDF",
        selected_rate_id: data.selected_rate_id as string | undefined,
      });

      return {
        data: {
          ...data,
          karrio_shipment_id: shipment.id,
          tracking_number: shipment.tracking_number,
          label_url: shipment.label_url,
          tracking_url: shipment.tracking_url,
          carrier_name: shipment.carrier_name,
          carrier_id: shipment.carrier_id,
        },
        labels: shipment.label_url
          ? [
              {
                tracking_number: shipment.tracking_number,
                tracking_url: shipment.tracking_url || "",
                label_url: shipment.label_url,
              },
            ]
          : [],
      };
    } catch (error) {
      if (error instanceof MedusaError) {
        throw error;
      }
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to create Karrio fulfillment: ${error}`,
      );
    }
  }

  async cancelFulfillment(fulfillment: Record<string, unknown>): Promise<void> {
    const shipmentId = fulfillment.karrio_shipment_id as string | undefined;
    if (shipmentId) {
      try {
        await this.client.cancelShipment(shipmentId);
      } catch (error) {
        this.logger.warn(
          `Karrio: Failed to cancel shipment ${shipmentId}: ${error}`,
        );
      }
    }
  }

  async createReturnFulfillment(
    fulfillment: Record<string, unknown>,
  ): Promise<CreateFulfillmentResult> {
    return {
      data: fulfillment,
      labels: [],
    };
  }

  private buildShipperAddress(
    fromLocation?: { name?: string; address?: Record<string, unknown> } | null,
  ): KarrioAddress {
    if (fromLocation?.address) {
      const addr = fromLocation.address;
      const shipper = {
        person_name: fromLocation.name || "",
        address_line1: (addr.address_1 as string) || "",
        address_line2: (addr.address_2 as string) || undefined,
        city: (addr.city as string) || "",
        state_code: normalizeAddressCode(addr.province),
        postal_code: (addr.postal_code as string) || "",
        country_code: normalizeAddressCode(addr.country_code) || "",
        phone_number: (addr.phone as string) || undefined,
        residential: false,
      };

      if (shipper.city.trim() && shipper.postal_code.trim() && shipper.country_code) {
        return shipper;
      }
    }

    return this.buildDefaultShipperAddress();
  }

  private buildDefaultShipperAddress(): KarrioAddress {
    return buildShipperAddress();
  }

  private buildRecipientAddress(
    address: Record<string, unknown>,
  ): KarrioAddress {
    return {
      person_name:
        `${address.first_name || ""} ${address.last_name || ""}`.trim(),
      address_line1: (address.address_1 as string) || "",
      address_line2: (address.address_2 as string) || undefined,
      city: (address.city as string) || "",
      state_code: normalizeAddressCode(address.province),
      postal_code: (address.postal_code as string) || "",
      country_code: normalizeAddressCode(address.country_code) || "",
      phone_number: (address.phone as string) || undefined,
      residential:
        typeof address.residential === "boolean" ? address.residential : true,
    };
  }

  private buildParcels(
    items: Array<Partial<Record<string, unknown>>>,
  ): KarrioParcel[] {
    return buildParcelsFromItems(
      items as Array<{ variant?: Record<string, unknown>; quantity?: number }>,
    );
  }

  private selectRateForOption(
    rates: KarrioRate[],
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
  ): KarrioRate | undefined {
    const selectedRateId = this.normalizeRateToken(data.selected_rate_id);
    const requestedService = this.normalizeRateToken(
      optionData.service || data.service,
    );
    const requestedServiceCode = this.normalizeRateToken(
      optionData.service_code || data.service_code,
    );
    const requestedServiceName = this.resolveRequestedServiceName(
      optionData,
      data,
    );

    return (
      rates.find((rate) => this.normalizeRateToken(rate.id) === selectedRateId) ||
      rates.find((rate) => this.normalizeRateToken(rate.service) === requestedService) ||
      rates.find(
        (rate) =>
          this.normalizeRateToken(rate.meta?.service_code) === requestedServiceCode,
      ) ||
      rates.find(
        (rate) =>
          this.normalizeRateToken(rate.meta?.service_name) === requestedServiceName ||
          this.normalizeRateToken(rate.service).includes(requestedServiceName),
      ) ||
      [...rates].sort((left, right) => left.total_charge - right.total_charge)[0]
    );
  }

  private resolveRequestedServiceName(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
  ): string {
    const rawName = this.normalizeRateToken(
      optionData.service_name ||
        data.service_name ||
        optionData.name ||
        data.name ||
        optionData.code ||
        data.code,
    );

    if (rawName.includes("priority") || rawName.includes("express")) {
      return "priority";
    }

    if (rawName.includes("economy") || rawName.includes("standard")) {
      return "economy";
    }

    return rawName;
  }

  private normalizeRateToken(value: unknown): string {
    return typeof value === "string"
      ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")
      : "";
  }
}

export default KarrioFulfillmentService;
