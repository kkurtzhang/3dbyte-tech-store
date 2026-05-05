import { pretty, render } from "@react-email/render";

import {
  formatEmailAddress,
  formatEmailDate,
  formatEmailMoney,
} from "../formatters";
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

const getSummarySubtotal = (order: OrderPlacedEmailOrder): number | null | undefined =>
  order.subtotal ?? order.item_subtotal ?? order.item_total;

const formatDiscount = (
  amount: number | null | undefined,
  currencyCode: string,
): string => `-${formatEmailMoney(Math.abs(amount ?? 0), currencyCode)}`;

export const renderOrderPlacedEmail = async ({
  order,
  store,
}: RenderOrderPlacedEmailInput): Promise<RenderedEmail> => {
  const storeName = store.name || "3D Byte Tech";
  const html = await pretty(
    await render(<OrderPlacedEmail order={order} store={{ name: storeName }} />),
  );
  const itemLines = (order.items || []).map(
    (item) =>
      `${item.quantity} x ${item.product_title || "Product"} - ${formatEmailMoney(
        item.unit_price * item.quantity,
        order.currency_code,
      )}`,
  );
  const addressLines = formatEmailAddress(order.shipping_address);
  const discountTotal = order.discount_total ?? 0;
  const summaryLines = [
    `Subtotal: ${formatEmailMoney(getSummarySubtotal(order), order.currency_code)}`,
    ...(discountTotal !== 0
      ? [`Discount: ${formatDiscount(discountTotal, order.currency_code)}`]
      : []),
    `Shipping: ${formatEmailMoney(order.shipping_total, order.currency_code)}`,
    `Tax: ${formatEmailMoney(order.tax_total, order.currency_code)}`,
    `Total: ${formatEmailMoney(order.total, order.currency_code)}`,
  ];

  return {
    html,
    subject: `Order Confirmation - ${storeName} #${order.display_id}`,
    text: [
      `Order #${order.display_id}`,
      `Placed: ${formatEmailDate(order.created_at)}`,
      "",
      "Items:",
      ...itemLines,
      "",
      "Shipping address:",
      ...addressLines,
      "",
      ...summaryLines,
    ].join("\n"),
  };
};
