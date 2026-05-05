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
      `Subtotal: ${formatEmailMoney(order.item_total, order.currency_code)}`,
      `Shipping: ${formatEmailMoney(order.shipping_total, order.currency_code)}`,
      `Tax: ${formatEmailMoney(order.tax_total, order.currency_code)}`,
      `Total: ${formatEmailMoney(order.total, order.currency_code)}`,
    ].join("\n"),
  };
};
