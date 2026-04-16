const mockGraph = jest.fn();

jest.mock("@medusajs/framework/utils", () => {
  const actual = jest.requireActual("@medusajs/framework/utils");

  return {
    ...actual,
    QueryContext: jest.fn((value) => value),
  };
});

jest.mock("../../../../../../links/bundle-item-product", () => ({
  __esModule: true,
  default: {
    entryPoint: "bundle_item_product_link",
  },
}));

import { QueryContext } from "@medusajs/framework/utils";
import BundleItemProductLink from "../../../../../../links/bundle-item-product";
import { GET } from "../route";

describe("GET /store/products/:id/bundles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads published bundle records with items after resolving bundle links", async () => {
    mockGraph.mockResolvedValue({
      data: [],
    });
    mockGraph
      .mockResolvedValueOnce({
        data: [
          {
            bundle_item: {
              id: "item_1",
              bundle: {
                id: "bundle_123",
              },
            },
          },
          {
            bundle_item: {
              id: "item_2",
              bundle: {
                id: "bundle_456",
              },
            },
          },
          {
            bundle_item: {
              id: "item_3",
              bundle: {
                id: "bundle_123",
              },
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "bundle_123",
            title: "Starter Bundle",
            product: {
              id: "prod_bundle_123",
              title: "Starter Bundle Product",
              handle: "starter-bundle",
              status: "published",
            },
            items: [
              {
                id: "item_1",
                quantity: 1,
                product: {
                  id: "prod_printer",
                },
              },
            ],
          },
          {
            id: "bundle_456",
            title: "Draft Bundle",
            product: {
              id: "prod_bundle_456",
              title: "Draft Bundle Product",
              handle: "draft-bundle",
              status: "draft",
            },
            items: [],
          },
        ],
      });

    const req = {
      params: {
        id: "prod_printer",
      },
      query: {
        currency_code: "aud",
        region_id: "reg_123",
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
      currency_code: "aud",
    });
    expect(mockGraph).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        entity: BundleItemProductLink.entryPoint,
        filters: {
          product_id: "prod_printer",
        },
      }),
    );
    expect(mockGraph).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        entity: "bundle",
        filters: {
          id: ["bundle_123", "bundle_456"],
        },
      }),
    );
    expect(json).toHaveBeenCalledWith({
      bundles: [
        expect.objectContaining({
          id: "bundle_123",
          title: "Starter Bundle",
          items: [
            expect.objectContaining({
              id: "item_1",
            }),
          ],
        }),
      ],
    });
  });
});
