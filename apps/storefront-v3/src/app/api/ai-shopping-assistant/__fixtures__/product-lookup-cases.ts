import type { ProductLookupDecision } from "../product-link-routing";

export const productLookupCases: Array<{
  message: string;
  status: ProductLookupDecision["status"];
  allowed: boolean;
}> = [
  {
    message:
      "Send me the product page for PETG. Don't search my order history and products.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't look up products and my account.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders and my account.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my order history or products.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't look up products or my account.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders or my account.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my order history nor products.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't look up products nor my account.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders nor my account.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my order history & products.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't look up products & my account.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders & my account.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my order history &amp; products.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't look up products &amp; my account.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders &amp; my account.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my order history plus products.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't look up products plus my account.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders plus my account.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my order history, products.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't look up products, my account.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders, my account.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my account, products, or order history.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my order history plus the product catalogue.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my order history with products.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my order history / products.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my account products.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search product account records.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders including products.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my order history or.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders + products.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my account details for products.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my order history for product details.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders and show me PETG.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders, and please send the page.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders but products.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders, but show me the product page.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders and don't look up my account.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders & don't look up products.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders. Don't search products either.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders; don't look up products.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders\nDon't look up products.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders. Show me PETG products.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't search my orders? Show me the catalogue.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message: "Send me the product page for PETG. Don't search yet.",
    status: "product-denied",
    allowed: false,
  },
  {
    message: "Send me the product page for PETG. Without a search.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Avoid running a catalogue search.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Without performing an order lookup.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't perform an account lookup & product search.",
    status: "product-denied",
    allowed: false,
  },
  {
    message: "Send me the product page for PETG. Don't look up that.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message: "Send me the product page for PETG. Don't search for PETG.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message: "Send me the product page for PETG. Don't search again, please.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't send me this product link.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't share my personal details.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message: "Send me the product page for PETG. Don't fetch customer records.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message: "Send me the product page for PETG. No need to show prices.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message: "Send me the product page for PETG. No need to run benchmarks.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't forget to search for PETG.",
    status: "allowed",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Don't give up searching for PETG.",
    status: "allowed",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. The product page does not load.",
    status: "allowed",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Show products without sharing my personal details.",
    status: "unrelated-denied",
    allowed: true,
  },
  {
    message:
      "Send me the product page for PETG. Find a product without a spool.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message: "Send me the product page for PETG. Don't ever search products.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't please search my account.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message: "Send me the product page for PETG. Don't inspect products.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't retrieve my account or products.",
    status: "ambiguous",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't share my account & product links.",
    status: "product-denied",
    allowed: false,
  },
  {
    message:
      "Send me the product page for PETG. Don't show prices and product pages.",
    status: "product-denied",
    allowed: false,
  },
];
