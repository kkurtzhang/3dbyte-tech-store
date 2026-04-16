import { findMatchingCartLineItem } from "../utils/find-matching-cart-line-item";

describe("findMatchingCartLineItem", () => {
  it("matches an existing line item when both metadata values are empty", () => {
    const match = findMatchingCartLineItem(
      [
        {
          id: "line_1",
          quantity: 1,
          variant_id: "variant_1",
          metadata: null,
        },
      ],
      "variant_1",
      undefined
    );

    expect(match).toEqual(
      expect.objectContaining({
        id: "line_1",
      })
    );
  });

  it("matches an existing bundle child only when metadata is equivalent", () => {
    const match = findMatchingCartLineItem(
      [
        {
          id: "line_1",
          quantity: 1,
          variant_id: "variant_1",
          metadata: {
            bundle_id: "bundle_1",
            bundle_quantity: 1,
          },
        },
      ],
      "variant_1",
      {
        bundle_id: "bundle_1",
        bundle_quantity: 1,
      }
    );

    expect(match).toEqual(
      expect.objectContaining({
        id: "line_1",
      })
    );
  });

  it("does not match line items when metadata describes a different cart entry", () => {
    const match = findMatchingCartLineItem(
      [
        {
          id: "line_1",
          quantity: 1,
          variant_id: "variant_1",
          metadata: {
            bundle_id: "bundle_1",
          },
        },
      ],
      "variant_1",
      undefined
    );

    expect(match).toBeUndefined();
  });
});
