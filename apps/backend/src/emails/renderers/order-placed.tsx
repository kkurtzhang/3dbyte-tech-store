import { pretty, render } from "@react-email/render";
import { getSafePaymentMethodDisplay } from "@3dbyte-tech-store/shared-utils";

import {
  areEmailAddressesEqual,
  formatEmailAddress,
  formatEmailDate,
  formatEmailMoney,
} from "../formatters";
import {
  buildOrderPlacedEmailItemGroups,
  getCustomerOrderNumber,
  getCustomerSummarySubtotal,
  getCustomerStoreName,
  getItemLineTotal,
  getItemQuantity,
  getItemReleaseDate,
  getItemTitle,
  getItemVariantText,
  getOrderDiscountTotal,
  getOrderShippingTotal,
  getOrderTaxTotal,
  getOrderTotal,
  getOrderTrackingUrl,
  getShippingMethodName,
} from "../order-placed-data";
import OrderPlacedEmail from "../templates/order-placed";
import type {
  OrderPlacedEmailOrder,
  OrderPlacedEmailStore,
  RenderedEmail,
} from "../types";

type RenderOrderPlacedEmailInput = {
  order: OrderPlacedEmailOrder;
  store: OrderPlacedEmailStore;
};

const formatDiscount = (
  amount: number | null | undefined,
  currencyCode: string,
): string => `-${formatEmailMoney(Math.abs(amount ?? 0), currencyCode)}`;

const getItemTextLines = (
  item: NonNullable<OrderPlacedEmailOrder["items"]>[number],
  currencyCode: string,
): string[] => {
  const releaseDate = getItemReleaseDate(item);
  const itemLine = `${getItemQuantity(item)} x ${getItemTitle(item)}${
    getItemVariantText(item) ? ` (${getItemVariantText(item)})` : ""
  } - ${formatEmailMoney(getItemLineTotal(item), currencyCode)}`;

  return [
    itemLine,
    ...(releaseDate
      ? [`Pre-order: releases ${formatEmailDate(releaseDate)}`]
      : []),
  ];
};

const getBundleItemText = (
  item: NonNullable<OrderPlacedEmailOrder["items"]>[number],
): string => {
  const variantText = getItemVariantText(item);
  const itemText = `${getItemQuantity(item)} x ${getItemTitle(item)}${
    variantText ? ` - ${variantText}` : ""
  }`;
  const releaseDate = getItemReleaseDate(item);

  return releaseDate
    ? `${itemText} (releases ${formatEmailDate(releaseDate)})`
    : itemText;
};

const getBundleLineTotal = (
  items: NonNullable<OrderPlacedEmailOrder["items"]>,
): number => items.reduce((sum, item) => sum + getItemLineTotal(item), 0);

export const renderOrderPlacedEmail = async ({
  order,
  store,
}: RenderOrderPlacedEmailInput): Promise<RenderedEmail> => {
  const storeName = getCustomerStoreName(store);
  const orderNumber = getCustomerOrderNumber(order);
  const trackingUrl = getOrderTrackingUrl(order);
  const html = await pretty(
    await render(<OrderPlacedEmail order={order} store={{ name: storeName }} />),
  );
  const itemLines = buildOrderPlacedEmailItemGroups(order.items).flatMap((group) => {
    if (group.type === "item") {
      return getItemTextLines(group.item, order.currency_code);
    }

    return [
      `Bundle: ${group.bundleTitle ?? "Product Bundle"} - ${formatEmailMoney(
        getBundleLineTotal(group.items),
        order.currency_code,
      )}`,
      `Qty: ${group.quantity}`,
      "Includes:",
      ...group.items.map((item) => `  - ${getBundleItemText(item)}`),
    ];
  });
  const shippingAddressLines = formatEmailAddress(order.shipping_address);
  const billingAddressLines = areEmailAddressesEqual(
    order.shipping_address,
    order.billing_address,
  )
    ? ["Same as shipping address"]
    : formatEmailAddress(order.billing_address);
  const shippingMethodName = getShippingMethodName(order);
  const paymentMethodDisplay = getSafePaymentMethodDisplay(order);
  const discountTotal = getOrderDiscountTotal(order);
  const summaryLines = [
    `Subtotal: ${formatEmailMoney(getCustomerSummarySubtotal(order), order.currency_code)}`,
    ...(discountTotal !== 0
      ? [`Discount: ${formatDiscount(discountTotal, order.currency_code)}`]
      : []),
    `Shipping: ${formatEmailMoney(getOrderShippingTotal(order), order.currency_code)}`,
    `Total (${order.currency_code.toUpperCase()}): ${formatEmailMoney(getOrderTotal(order), order.currency_code)}`,
    `(Includes GST: ${formatEmailMoney(getOrderTaxTotal(order), order.currency_code)})`,
  ];

  return {
    html,
    subject: `Your ${storeName} order ${orderNumber} is confirmed`,
    text: [
      `Order ${orderNumber}`,
      `Placed: ${formatEmailDate(order.created_at)}`,
      "",
      "Items:",
      ...itemLines,
      "",
      `Track your order: ${trackingUrl}`,
      "",
      ...(shippingMethodName ? [`Shipping method: ${shippingMethodName}`, ""] : []),
      `Payment method: ${paymentMethodDisplay}`,
      "",
      "Shipping address:",
      ...shippingAddressLines,
      "",
      "Billing address:",
      ...billingAddressLines,
      "",
      ...summaryLines,
    ].join("\n"),
  };
};
