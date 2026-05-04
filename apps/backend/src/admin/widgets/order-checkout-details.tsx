import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types";
import { Container, Heading, Text } from "@medusajs/ui";

import { useAdminOrderCheckoutDetails } from "../hooks/order-details";
import {
  buildAdminOrderBundleGroups,
  getAdminOrderPreorderItems,
  getAdminOrderShippingDisplayName,
} from "../lib/order-details";

const OrderCheckoutDetailsWidget = ({
  data: order,
}: DetailWidgetProps<AdminOrder>) => {
  const { data: enrichedOrderData, isLoading } = useAdminOrderCheckoutDetails(
    order.id
  );
  const enrichedOrder = enrichedOrderData?.order ?? order;
  const preorderItems = getAdminOrderPreorderItems(enrichedOrder);
  const bundleGroups = buildAdminOrderBundleGroups(enrichedOrder);
  const shippingDisplayName = getAdminOrderShippingDisplayName(enrichedOrder);

  if (
    !isLoading &&
    !preorderItems.length &&
    !bundleGroups.length &&
    !shippingDisplayName
  ) {
    return null;
  }

  return (
    <Container className="divide-y p-0">
      <div className="space-y-1 px-6 py-4">
        <Heading level="h2">Checkout & fulfillment details</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Shipping choices and special item handling for fulfillment.
        </Text>
      </div>

      {shippingDisplayName ? (
        <div className="px-6 py-4">
          <Text size="small" weight="plus" className="uppercase tracking-wide">
            Shipping service
          </Text>
          <Text size="small" className="mt-1 text-ui-fg-subtle">
            {shippingDisplayName}
          </Text>
        </div>
      ) : null}

      {isLoading && !preorderItems.length ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Loading pre-order details...
          </Text>
        </div>
      ) : null}

      {preorderItems.length ? (
        <div className="space-y-3 px-6 py-4">
          <Text size="small" weight="plus" className="uppercase tracking-wide">
            Pre-order items
          </Text>
          {preorderItems.map((item) => (
            <div
              key={item.id}
              className="space-y-2 rounded-md border border-ui-border-base px-3 py-3"
            >
              <Text size="small" weight="plus">
                {item.title}
              </Text>
              <div className="grid gap-1">
                {item.sku ? (
                  <Text size="small" className="font-mono text-ui-fg-subtle">
                    {item.sku}
                  </Text>
                ) : null}
                <Text size="small" className="text-ui-fg-subtle">
                  Quantity: {item.quantity}
                </Text>
                <Text
                  size="small"
                  className="w-fit rounded-md border border-ui-tag-orange-border bg-ui-tag-orange-bg px-2 py-1 text-ui-tag-orange-text"
                >
                  Releases on {item.availableDate}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Do not fulfill before this release date.
                </Text>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {bundleGroups.length ? (
        <div className="space-y-3 px-6 py-4">
          <Text size="small" weight="plus" className="uppercase tracking-wide">
            Bundled products
          </Text>
          {bundleGroups.map((group) => (
            <details
              key={group.bundleId}
              className="rounded-md border border-ui-border-base"
            >
              <summary className="cursor-pointer px-3 py-2">
                <Text size="small" weight="plus">
                  {group.title} x {group.quantity}
                </Text>
              </summary>
              <div className="space-y-2 border-t border-ui-border-base px-3 py-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div>
                      <Text size="small" className="text-ui-fg-subtle">
                        {item.title}
                      </Text>
                      {item.sku ? (
                        <Text size="small" className="font-mono text-ui-fg-muted">
                          {item.sku}
                        </Text>
                      ) : null}
                    </div>
                    <Text size="small" className="font-mono text-ui-fg-subtle">
                      x {item.quantity}
                    </Text>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : null}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
});

export default OrderCheckoutDetailsWidget;
