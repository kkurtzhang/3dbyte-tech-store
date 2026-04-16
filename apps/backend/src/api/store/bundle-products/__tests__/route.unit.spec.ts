const mockGraph = jest.fn();
const mockGetVariantAvailability = jest.fn();

jest.mock("@medusajs/framework/utils", () => {
  const actual = jest.requireActual("@medusajs/framework/utils");

  return {
    ...actual,
    QueryContext: jest.fn((value) => value),
    getVariantAvailability: (...args: unknown[]) => mockGetVariantAvailability(...args),
  };
});

import { QueryContext } from "@medusajs/framework/utils";
import { GET } from "../[id]/route";

describe("GET /store/bundle-products/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queries the bundle graph with pricing context and returns the bundle with scoped availability", async () => {
    mockGraph.mockResolvedValue({
      data: [
        {
          id: "bundle_123",
          title: "Starter Bundle",
          product: {
            variants: [
              {
                id: "variant_bundle",
                manage_inventory: true,
                inventory_quantity: null,
              },
            ],
          },
          items: [
            {
              product: {
                variants: [
                  {
                    id: "variant_child",
                    manage_inventory: true,
                    inventory_quantity: null,
                  },
                  {
                    id: "variant_unmanaged",
                    manage_inventory: false,
                    inventory_quantity: null,
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    mockGetVariantAvailability.mockResolvedValue({
      variant_bundle: {
        availability: 12,
        sales_channel_id: "sc_123",
      },
      variant_child: {
        availability: 4,
        sales_channel_id: "sc_123",
      },
    });

    const req = {
      params: {
        id: "bundle_123",
      },
      query: {
        currency_code: "usd",
        region_id: "reg_123",
      },
      publishable_key_context: {
        sales_channel_ids: ["sc_123"],
      },
      scope: {
        resolve: jest.fn().mockReturnValue({
          graph: mockGraph,
        }),
      },
    };

    const json = jest.fn();
    const res = { json };

    await GET(req as never, res as never);

    expect(QueryContext).toHaveBeenCalledWith({
      region_id: "reg_123",
      currency_code: "usd",
    });
    expect(QueryContext).toHaveBeenCalledTimes(2);
    expect(mockGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "bundle",
        filters: {
          id: "bundle_123",
        },
        fields: expect.arrayContaining([
          "product.variants.prices.*",
          "product.variants.calculated_price.*",
          "items.product.variants.prices.*",
          "items.product.variants.calculated_price.*",
        ]),
      }),
      {
        throwIfKeyNotFound: true,
      }
    );
    expect(mockGetVariantAvailability).toHaveBeenCalledWith(
      expect.anything(),
      {
        variant_ids: ["variant_bundle", "variant_child", "variant_unmanaged"],
        sales_channel_id: "sc_123",
      }
    );
    expect(json).toHaveBeenCalledWith({
      bundle_product: {
        id: "bundle_123",
        title: "Starter Bundle",
        product: {
          variants: [
            {
              id: "variant_bundle",
              manage_inventory: true,
              inventory_quantity: 12,
            },
          ],
        },
        items: [
          {
            product: {
              variants: [
                {
                  id: "variant_child",
                  manage_inventory: true,
                  inventory_quantity: 4,
                },
                {
                  id: "variant_unmanaged",
                  manage_inventory: false,
                  inventory_quantity: null,
                },
              ],
            },
          },
        ],
      },
    });
  });
});
