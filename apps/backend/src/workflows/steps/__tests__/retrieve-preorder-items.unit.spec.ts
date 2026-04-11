import { retrievePreorderVariantIds } from "../retrieve-preorder-items";

describe("retrievePreorderVariantIds", () => {
  it("returns unique preorder variant ids from cart line items", () => {
    const lineItems = [
      { variant: { preorder_variant: { id: "pre_1" } } },
      { variant: { preorder_variant: { id: "pre_2" } } },
      { variant: { preorder_variant: { id: "pre_1" } } },
      { variant: {} },
    ] as never;

    expect(retrievePreorderVariantIds(lineItems)).toEqual(["pre_1", "pre_2"]);
  });
});
