import {
  createBundledProductDraftItem,
  getBundledProductDraftItemKey,
} from "../bundled-product-drafts";

describe("bundled product draft items", () => {
  it("keeps a stable React key after a product is selected", () => {
    const draftItem = createBundledProductDraftItem("bundle-item-1");
    const initialKey = getBundledProductDraftItemKey(draftItem, 0);

    const selectedItem = {
      ...draftItem,
      product_id: "prod_123",
      selected_product: {
        id: "prod_123",
        title: "Polymaker PETG Black",
      },
    };

    expect(getBundledProductDraftItemKey(selectedItem, 0)).toBe(initialKey);
  });
});
