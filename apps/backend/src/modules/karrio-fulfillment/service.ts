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
import type {
  KarrioAddress,
  KarrioModuleOptions,
  KarrioParcel,
} from "../karrio/types";

const DEFAULT_WEIGHT_KG = 0.5;
const DEFAULT_DIMENSION_CM = 10;

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
    try {
      const carriers = await this.client.getCarriers();
      return carriers
        .filter((c) => c.active)
        .map((carrier) => ({
          id: `karrio-${carrier.carrier_id}`,
          name: carrier.display_name || carrier.carrier_name,
          carrier_id: carrier.carrier_id,
          carrier_name: carrier.carrier_name,
          test_mode: carrier.test_mode,
        }));
    } catch (error) {
      this.logger.warn(`Karrio: Failed to fetch carriers, using default option: ${error}`);
      return [
        {
          id: "karrio-default",
          name: "Karrio Shipping",
        },
      ];
    }
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return { ...optionData, ...data };
  }

  async validateOption(
    data: Record<string, unknown>
  ): Promise<boolean> {
    return true;
  }

  async canCalculate(
    _data: CreateShippingOptionDTO
  ): Promise<boolean> {
    return true;
  }

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    const shippingAddress = context.shipping_address;
    if (!shippingAddress) {
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false };
    }

    try {
      const shipper = this.buildShipperAddress(context.from_location);
      const recipient = this.buildRecipientAddress(shippingAddress);
      const parcels = this.buildParcels(context.items || []);

      const carrierIds = optionData.carrier_id
        ? [optionData.carrier_id as string]
        : undefined;

      const rateResponse = await this.client.fetchRates({
        shipper,
        recipient,
        parcels,
        carrier_ids: carrierIds,
      });

      const rate = rateResponse.rates[0];
      if (!rate) {
        return { calculated_amount: 0, is_calculated_price_tax_inclusive: false };
      }

      const amountInCents = Math.round(rate.total_charge * 100);

      return {
        calculated_amount: amountInCents,
        is_calculated_price_tax_inclusive: false,
      };
    } catch (error) {
      this.logger.warn(`Karrio: Price calculation failed, returning 0: ${error}`);
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false };
    }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    try {
      const shippingAddress = (order as Record<string, unknown>)?.shipping_address as Record<string, unknown> | undefined;
      if (!shippingAddress) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Shipping address is required to create a Karrio fulfillment"
        );
      }

      const recipient: KarrioAddress = {
        person_name: `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim(),
        address_line1: (shippingAddress.address_1 as string) || "",
        address_line2: (shippingAddress.address_2 as string) || undefined,
        city: (shippingAddress.city as string) || "",
        state_code: (shippingAddress.province as string) || undefined,
        postal_code: (shippingAddress.postal_code as string) || "",
        country_code: (shippingAddress.country_code as string) || "",
        phone_number: (shippingAddress.phone as string) || undefined,
      };

      const parcels = this.buildParcels(items);
      const service = (data.service as string) || (data.carrier_name as string) || "";
      const carrierIds = data.carrier_id ? [data.carrier_id as string] : undefined;

      const shipment = await this.client.createShipment({
        shipper: this.buildDefaultShipperAddress(),
        recipient,
        parcels,
        service,
        carrier_ids: carrierIds,
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
        `Failed to create Karrio fulfillment: ${error}`
      );
    }
  }

  async cancelFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<void> {
    const shipmentId = fulfillment.karrio_shipment_id as string | undefined;
    if (shipmentId) {
      try {
        await this.client.cancelShipment(shipmentId);
      } catch (error) {
        this.logger.warn(`Karrio: Failed to cancel shipment ${shipmentId}: ${error}`);
      }
    }
  }

  async createReturnFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return fulfillment;
  }

  private buildShipperAddress(
    fromLocation?: { name?: string; address?: Record<string, unknown> } | null
  ): KarrioAddress {
    if (fromLocation?.address) {
      const addr = fromLocation.address;
      return {
        person_name: fromLocation.name || "",
        address_line1: (addr.address_1 as string) || "",
        address_line2: (addr.address_2 as string) || undefined,
        city: (addr.city as string) || "",
        state_code: (addr.province as string) || undefined,
        postal_code: (addr.postal_code as string) || "",
        country_code: (addr.country_code as string) || "",
        phone_number: (addr.phone as string) || undefined,
      };
    }

    return this.buildDefaultShipperAddress();
  }

  private buildDefaultShipperAddress(): KarrioAddress {
    return {
      person_name: process.env.STORE_SHIPPER_NAME || "3D Byte Tech",
      address_line1: process.env.STORE_SHIPPER_ADDRESS || "",
      city: process.env.STORE_SHIPPER_CITY || "",
      state_code: process.env.STORE_SHIPPER_STATE || "",
      postal_code: process.env.STORE_SHIPPER_POSTAL || "",
      country_code: process.env.STORE_SHIPPER_COUNTRY || "AU",
      phone_number: process.env.STORE_SHIPPER_PHONE || "",
    };
  }

  private buildRecipientAddress(
    address: Record<string, unknown>
  ): KarrioAddress {
    return {
      person_name: `${address.first_name || ""} ${address.last_name || ""}`.trim(),
      address_line1: (address.address_1 as string) || "",
      address_line2: (address.address_2 as string) || undefined,
      city: (address.city as string) || "",
      state_code: (address.province as string) || undefined,
      postal_code: (address.postal_code as string) || "",
      country_code: (address.country_code as string) || "",
      phone_number: (address.phone as string) || undefined,
    };
  }

  private buildParcels(
    items: Array<Partial<Record<string, unknown>>>
  ): KarrioParcel[] {
    const totalWeight = items.reduce((sum, item) => {
      const variant = item.variant as Record<string, unknown> | undefined;
      const weight = (variant?.weight as number) || DEFAULT_WEIGHT_KG;
      const quantity = (item.quantity as number) || 1;
      return sum + weight * quantity;
    }, 0);

    return [
      {
        weight: totalWeight || DEFAULT_WEIGHT_KG,
        weight_unit: "KG",
        width: DEFAULT_DIMENSION_CM,
        height: DEFAULT_DIMENSION_CM,
        length: DEFAULT_DIMENSION_CM,
        dimension_unit: "CM",
      },
    ];
  }
}

export default KarrioFulfillmentService;
