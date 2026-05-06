import { pretty, render } from "@react-email/render";

import {
  areEmailAddressesEqual,
  formatEmailAddress,
  formatEmailDate,
  formatEmailMoney,
} from "../formatters";
import {
  buildOrderPlacedEmailItemGroups,
  getCustomerOrderNumber,
  getCustomerStoreName,
  getItemLineTotal,
  getItemQuantity,
  getItemReleaseDate,
  getItemTitle,
  getItemUnitPrice,
  getItemVariantText,
  getOrderDiscountTotal,
  getOrderShippingTotal,
  getOrderTaxTotal,
  getOrderTotal,
  getOrderTrackingUrl,
  getShippingMethodName,
  getSummarySubtotal,
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
  prefix = "",
): string[] => {
  const releaseDate = getItemReleaseDate(item);
  const itemLine = `${prefix}${getItemQuantity(item)} x ${getItemTitle(item)}${
    getItemVariantText(item) ? ` (${getItemVariantText(item)})` : ""
  } - ${formatEmailMoney(getItemLineTotal(item), currencyCode)}`;

  return [
    itemLine,
    `${prefix}Unit: ${formatEmailMoney(getItemUnitPrice(item), currencyCode)}`,
    ...(releaseDate
      ? [`${prefix}Releases on ${formatEmailDate(releaseDate)}`]
      : []),
  ];
};

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
      `Bundle: ${group.bundleTitle ?? "Product Bundle"}`,
      `Bundle quantity: ${group.quantity}`,
      ...group.items.flatMap((item) =>
        getItemTextLines(item, order.currency_code, "  "),
      ),
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
  const discountTotal = getOrderDiscountTotal(order);
  const summaryLines = [
    `Subtotal: ${formatEmailMoney(getSummarySubtotal(order), order.currency_code)}`,
    ...(discountTotal !== 0
      ? [`Discount: ${formatDiscount(discountTotal, order.currency_code)}`]
      : []),
    `Shipping: ${formatEmailMoney(getOrderShippingTotal(order), order.currency_code)}`,
    `Tax: ${formatEmailMoney(getOrderTaxTotal(order), order.currency_code)}`,
    `Total: ${formatEmailMoney(getOrderTotal(order), order.currency_code)}`,
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
