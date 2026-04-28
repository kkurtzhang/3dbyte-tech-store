import { sdk } from "./client";

export interface ShippingRate {
  id: string;
  carrier: {
    id: string;
    name: string;
    slug: string;
  };
  service: string;
  serviceName: string;
  totalCharge: number;
  currency: string;
  estimatedDeliveryDays?: number;
  estimatedDeliveryDate?: string;
  transitDays?: number;
}

export interface LiveRateResponse {
  rates: ShippingRate[];
}

export async function getLiveShippingRates(
  cartId: string
): Promise<LiveRateResponse> {
  return sdk.client.fetch<LiveRateResponse>(`/store/shipping-rates`, {
    method: "POST",
    body: { cart_id: cartId },
  });
}
