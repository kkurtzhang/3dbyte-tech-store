import {
  buildAdminOrderBundleGroups,
  getAdminOrderPreorderItems,
  getAdminOrderShippingDisplayName,
} from "../order-details";

describe("admin order details helpers", () => {
  it("labels preorder items with availability dates", () => {
    expect(
      getAdminOrderPreorderItems({
        items: [
          {
            id: "item_1",
            title: "Polymaker HT-PLA-GF",
            variant: {
              preorder_variant: {
                status: "enabled",
                available_date: "2026-06-01T00:00:00.000Z",
              },
            },
          },
        ],
      })
    ).toEqual([
      {
        id: "item_1",
        title: "Polymaker HT-PLA-GF",
        availableDate: "June 1, 2026",
      },
    ]);
  });

  it("groups bundled order line items for an accordion", () => {
    expect(
      buildAdminOrderBundleGroups({
        items: [
          {
            id: "item_1",
            title: "Nozzle",
            quantity: 1,
            metadata: {
              bundle_id: "bundle_1",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
          },
          {
            id: "item_2",
            title: "Filament",
            quantity: 2,
            metadata: {
              bundle_id: "bundle_1",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
          },
        ],
      })
    ).toEqual([
      {
        bundleId: "bundle_1",
        title: "Starter Bundle",
        quantity: 1,
        items: [
          { id: "item_1", title: "Nozzle", quantity: 1 },
          { id: "item_2", title: "Filament", quantity: 2 },
        ],
      },
    ]);
  });

  it("uses selected carrier details instead of the generic Karrio option name", () => {
    expect(
      getAdminOrderShippingDisplayName({
        shipping_methods: [
          {
            name: "Karrio-standard",
            data: {
              carrier_name: "Aramex",
              service_name: "Priority",
            },
          },
        ],
      })
    ).toBe("Aramex Priority");
  });
});
