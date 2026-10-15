/** Both server enforcement and Admin visibility use the same fixed pilot scope. */
export const DOCUMENT_UID = "api::product-document.product-document";
export const REVIEW_ACTION = "api::knowledge-review.review";
export const PILOT_PRODUCTS: Readonly<Record<string, string>> = Object.freeze({
  mu3sv3poa965a25lvvlbdngc: "prod_01KSY6A5870Y2J3VR66XAWP9GD",
  uur1zr0pe99e6px1r5ljs0nm: "prod_01KSY6A587QB771VW85M12GSWJ",
});
export const isPilotDocument = (id: unknown): id is string =>
  typeof id === "string" &&
  Object.prototype.hasOwnProperty.call(PILOT_PRODUCTS, id);
