import { pretty, render } from "@react-email/render";

import {
  areEmailAddressesEqual,
  formatEmailAddress,
  formatEmailDate,
  formatEmailMoney,
} from "../formatters";
import {
  getCustomerOrderNumber,
  getCustomerStoreName,
  getItemLineTotal,
  getItemQuantity,
  getItemTitle,
  getItemVariantText,
  getOrderShippingTotal,
  getOrderTaxTotal,
  getOrderTotal,
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

export const renderOrderPlacedEmail = async ({
  order,
  store,
}: RenderOrderPlacedEmailInput): Promise<RenderedEmail> => {
  const storeName = getCustomerStoreName(store);
  const orderNumber = getCustomerOrderNumber(order);
  const html = await pretty(
    await render(<OrderPlacedEmail order={order} store={{ name: storeName }} />),
  );
  const itemLines = (order.items || []).map(
    (item) =>
      `${getItemQuantity(item)} x ${getItemTitle(item)}${
        getItemVariantText(item) ? ` (${getItemVariantText(item)})` : ""
      } - ${formatEmailMoney(
        getItemLineTotal(item),
        order.currency_code,
      )}`,
  );
  const shippingAddressLines = formatEmailAddress(order.shipping_address);
  const billingAddressLines = areEmailAddressesEqual(
    order.shipping_address,
    order.billing_address,
  )
    ? ["Same as shipping address"]
    : formatEmailAddress(order.billing_address);
  const shippingMethodName = getShippingMethodName(order);
  const discountTotal = order.discount_total ?? 0;
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
