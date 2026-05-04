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

export interface LiveRateShippingAddress {
  city: string;
  country_code: string;
  postal_code: string;
  province?: string;
}

export async function getLiveShippingRates(
  cartId: string,
  shippingAddress?: LiveRateShippingAddress
): Promise<LiveRateResponse> {
  return sdk.client.fetch<LiveRateResponse>(`/store/shipping-rates`, {
    method: "POST",
    body: {
      cart_id: cartId,
      ...(shippingAddress ? { shipping_address: shippingAddress } : {}),
    },
  });
}
