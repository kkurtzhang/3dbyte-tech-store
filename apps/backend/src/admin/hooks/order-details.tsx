import { useQuery } from "@tanstack/react-query";
import type { AdminOrder } from "@medusajs/framework/types";

import { sdk } from "../lib/sdk";

type AdminOrderCheckoutDetailsResponse = {
  order: AdminOrder;
};

const CHECKOUT_DETAILS_FIELDS = [
  "*items",
  "*items.variant",
  "*items.variant.preorder_variant",
  "*shipping_methods",
].join(",");

export const useAdminOrderCheckoutDetails = (orderId: string | undefined) => {
  return useQuery<AdminOrderCheckoutDetailsResponse>({
    queryKey: ["admin-order-checkout-details", orderId],
    enabled: Boolean(orderId),
    queryFn: () =>
      sdk.client.fetch<AdminOrderCheckoutDetailsResponse>(
        `/admin/orders/${orderId}`,
        {
          query: {
            fields: CHECKOUT_DETAILS_FIELDS,
          },
        }
      ),
  });
};
