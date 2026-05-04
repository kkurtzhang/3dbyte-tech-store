import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types";
import { Badge, Container, Heading, Text } from "@medusajs/ui";

import {
  buildAdminOrderBundleGroups,
  getAdminOrderPreorderItems,
  getAdminOrderShippingDisplayName,
} from "../lib/order-details";

const OrderCheckoutDetailsWidget = ({
  data: order,
}: DetailWidgetProps<AdminOrder>) => {
  const preorderItems = getAdminOrderPreorderItems(order);
  const bundleGroups = buildAdminOrderBundleGroups(order);
  const shippingDisplayName = getAdminOrderShippingDisplayName(order);

  if (!preorderItems.length && !bundleGroups.length && !shippingDisplayName) {
    return null;
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Checkout details</Heading>
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

      {preorderItems.length ? (
        <div className="space-y-3 px-6 py-4">
          <Text size="small" weight="plus" className="uppercase tracking-wide">
            Pre-order products
          </Text>
          {preorderItems.map((item) => (
            <div
              key={item.id}
              className="rounded-md border border-ui-border-base px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <Text size="small" weight="plus">
                  {item.title}
                </Text>
                <Badge size="2xsmall" rounded="full">
                  Pre-order
                </Badge>
              </div>
              <Text size="small" className="mt-1 text-ui-fg-subtle">
                Delivery date: {item.availableDate}
              </Text>
            </div>
          ))}
        </div>
      ) : null}

      {bundleGroups.length ? (
        <div className="space-y-3 px-6 py-4">
          <Text size="small" weight="plus" className="uppercase tracking-wide">
            Bundled product
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
                    className="flex items-center justify-between gap-3"
                  >
                    <Text size="small" className="text-ui-fg-subtle">
                      {item.title}
                    </Text>
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
  zone: "order.details.after",
});

export default OrderCheckoutDetailsWidget;
