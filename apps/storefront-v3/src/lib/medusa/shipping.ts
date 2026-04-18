import { sdk } from "./client";

export interface ShippingRate {
  id: string;
  carrier_name: string;
  service: string;
  total_charge: number;
  currency: string;
  transit_days?: number;
  estimated_delivery?: string;
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
