import { MedusaError } from "@medusajs/framework/utils";
import { buildBundleCartAdditionUpdates } from "../utils/build-bundle-cart-addition-updates";
import { buildBundleCartLineItems } from "../steps/prepare-bundle-cart-data";
import { buildBundleLineItemUpdates } from "../utils/build-bundle-line-item-updates";
import { getBundleLineItemIds } from "../utils/get-bundle-line-item-ids";

describe("bundle cart helpers", () => {
  it("builds bundle child line items with bundle metadata", () => {
    const items = buildBundleCartLineItems({
      bundle: {
        id: "bundle_123",
        title: "Calibration Bundle",
        product: {
          handle: "calibration-bundle",
          variants: [
            {
              id: "bundle_variant",
              calculated_price: {
                calculated_amount: 75,
                original_amount: 75,
              },
              prices: [{ amount: 75 }],
            },
          ],
        },
        items: [
          {
            id: "bundle_item_1",
            quantity: 2,
            product: {
              variants: [
                {
                  id: "variant_1",
                  calculated_price: {
                    calculated_amount: 40,
                    original_amount: 40,
                  },
                  prices: [{ amount: 40 }],
                },
              ],
            },
          },
        ],
      } as never,
      quantity: 3,
      items: [
        {
          item_id: "bundle_item_1",
          variant_id: "variant_1",
        },
      ],
    });

    expect(items).toEqual([
      {
        variant_id: "variant_1",
        quantity: 6,
        unit_price: 37.5,
        metadata: {
          bundle_id: "bundle_123",
          bundle_key: "bundle_123:bundle_item_1:variant_1",
          bundle_item_id: "bundle_item_1",
          bundle_item_quantity: 2,
          bundle_quantity: 3,
          bundle_regular_unit_price: 40,
          bundle_title: "Calibration Bundle",
          bundle_product_handle: "calibration-bundle",
        },
      },
    ]);
  });

  it("throws when a bundle item selection is missing", () => {
    expect(() =>
      buildBundleCartLineItems({
        bundle: {
          id: "bundle_123",
          title: "Calibration Bundle",
          product: {
            handle: "calibration-bundle",
          },
          items: [
            {
              id: "bundle_item_1",
              quantity: 1,
              product: {
                variants: [
                  {
                    id: "variant_1",
                  },
                ],
              },
            },
          ],
        } as never,
        quantity: 1,
        items: [],
      })
    ).toThrow(MedusaError);
  });

  it("throws when a selected variant is invalid for the bundle item", () => {
    expect(() =>
      buildBundleCartLineItems({
        bundle: {
          id: "bundle_123",
          title: "Calibration Bundle",
          product: {
            handle: "calibration-bundle",
          },
          items: [
            {
              id: "bundle_item_1",
              quantity: 1,
              product: {
                variants: [
                  {
                    id: "variant_1",
                  },
                ],
              },
            },
          ],
        } as never,
        quantity: 1,
        items: [
          {
            item_id: "bundle_item_1",
            variant_id: "variant_2",
          },
        ],
      })
    ).toThrow(MedusaError);
  });

  it("collects all cart line item ids for a bundle", () => {
    const ids = getBundleLineItemIds(
      [
        {
          id: "li_bundle_1",
          metadata: {
            bundle_id: "bundle_123",
          },
        },
        {
          id: "li_bundle_2",
          metadata: {
            bundle_id: "bundle_123",
          },
        },
        {
          id: "li_regular",
          metadata: {
            bundle_id: "bundle_456",
          },
        },
      ],
      "bundle_123"
    );

    expect(ids).toEqual(["li_bundle_1", "li_bundle_2"]);
  });

  it("adjusts bundle pricing when a more expensive variant is selected", () => {
    const items = buildBundleCartLineItems({
      bundle: {
        id: "bundle_123",
        title: "Calibration Bundle",
        product: {
          handle: "calibration-bundle",
          variants: [
            {
              id: "bundle_variant",
              calculated_price: {
                calculated_amount: 75,
                original_amount: 75,
              },
              prices: [{ amount: 75 }],
            },
          ],
        },
        items: [
          {
            id: "bundle_item_1",
            quantity: 1,
            product: {
              variants: [
                {
                  id: "variant_default",
                  calculated_price: {
                    calculated_amount: 50,
                    original_amount: 50,
                  },
                  prices: [{ amount: 50 }],
                },
                {
                  id: "variant_premium",
                  calculated_price: {
                    calculated_amount: 70,
                    original_amount: 70,
                  },
                  prices: [{ amount: 70 }],
                },
              ],
            },
          },
          {
            id: "bundle_item_2",
            quantity: 1,
            product: {
              variants: [
                {
                  id: "variant_regular",
                  calculated_price: {
                    calculated_amount: 40,
                    original_amount: 40,
                  },
                  prices: [{ amount: 40 }],
                },
              ],
            },
          },
        ],
      } as never,
      quantity: 1,
      items: [
        {
          item_id: "bundle_item_1",
          variant_id: "variant_premium",
        },
        {
          item_id: "bundle_item_2",
          variant_id: "variant_regular",
        },
      ],
    });

    expect(items).toEqual([
      expect.objectContaining({
        variant_id: "variant_premium",
        unit_price: 60.4545,
      }),
      expect.objectContaining({
        variant_id: "variant_regular",
        unit_price: 34.5455,
      }),
    ]);
  });

  it("builds bundle line item updates when the bundle quantity changes", () => {
    const updates = buildBundleLineItemUpdates(
      [
        {
          id: "line_1",
          quantity: 2,
          metadata: {
            bundle_id: "bundle_123",
            bundle_quantity: 1,
            bundle_title: "Calibration Bundle",
          },
        },
        {
          id: "line_2",
          quantity: 4,
          metadata: {
            bundle_id: "bundle_123",
            bundle_quantity: 1,
            bundle_title: "Calibration Bundle",
          },
        },
      ],
      "bundle_123",
      3
    );

    expect(updates).toEqual([
      {
        selector: {
          id: "line_1",
        },
        data: {
          quantity: 6,
          metadata: {
            bundle_id: "bundle_123",
            bundle_quantity: 3,
            bundle_title: "Calibration Bundle",
          },
        },
      },
      {
        selector: {
          id: "line_2",
        },
        data: {
          quantity: 12,
          metadata: {
            bundle_id: "bundle_123",
            bundle_quantity: 3,
            bundle_title: "Calibration Bundle",
          },
        },
      },
    ]);
  });

  it("throws when bundle line item quantities are not aligned to the current bundle quantity", () => {
    expect(() =>
      buildBundleLineItemUpdates(
        [
          {
            id: "line_1",
            quantity: 3,
            metadata: {
              bundle_id: "bundle_123",
              bundle_quantity: 2,
            },
          },
        ],
        "bundle_123",
        4
      )
    ).toThrow(MedusaError);
  });

  it("builds bundle addition updates when the same configured bundle is added again", () => {
    const updates = buildBundleCartAdditionUpdates(
      [
        {
          id: "line_1",
          quantity: 1,
          variant_id: "variant_1",
          metadata: {
            bundle_id: "bundle_123",
            bundle_key: "bundle_123:item_1:variant_1|item_2:variant_2",
            bundle_item_id: "item_1",
            bundle_item_quantity: 1,
            bundle_quantity: 1,
          },
        },
        {
          id: "line_2",
          quantity: 2,
          variant_id: "variant_2",
          metadata: {
            bundle_id: "bundle_123",
            bundle_key: "bundle_123:item_1:variant_1|item_2:variant_2",
            bundle_item_id: "item_2",
            bundle_item_quantity: 2,
            bundle_quantity: 1,
          },
        },
      ],
      [
        {
          variant_id: "variant_1",
          quantity: 1,
          metadata: {
            bundle_id: "bundle_123",
            bundle_key: "bundle_123:item_1:variant_1|item_2:variant_2",
            bundle_item_id: "item_1",
            bundle_item_quantity: 1,
            bundle_quantity: 1,
          },
        },
        {
          variant_id: "variant_2",
          quantity: 2,
          metadata: {
            bundle_id: "bundle_123",
            bundle_key: "bundle_123:item_1:variant_1|item_2:variant_2",
            bundle_item_id: "item_2",
            bundle_item_quantity: 2,
            bundle_quantity: 1,
          },
        },
      ]
    );

    expect(updates).toEqual([
      {
        selector: {
          id: "line_1",
        },
        data: {
          quantity: 2,
          metadata: expect.objectContaining({
            bundle_quantity: 2,
          }),
        },
      },
      {
        selector: {
          id: "line_2",
        },
        data: {
          quantity: 4,
          metadata: expect.objectContaining({
            bundle_quantity: 2,
          }),
        },
      },
    ]);
  });
});
