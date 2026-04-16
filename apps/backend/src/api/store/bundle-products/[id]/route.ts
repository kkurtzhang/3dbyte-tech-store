import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http";
import { getVariantAvailability, QueryContext } from "@medusajs/framework/utils";

type InventoryAwareVariant = {
  id: string;
  manage_inventory?: boolean | null;
  inventory_quantity?: number | null;
};

type BundleRouteProduct = {
  variants?: InventoryAwareVariant[] | null;
};

type BundleRouteItem = {
  product?: BundleRouteProduct | null;
};

type BundleRouteBundle = {
  product?: BundleRouteProduct | null;
  items?: BundleRouteItem[] | null;
};

function withAvailability(
  product: BundleRouteProduct | null | undefined,
  availability: Record<string, { availability: number | null }>
) {
  if (!product?.variants?.length) {
    return product;
  }

  return {
    ...product,
    variants: product.variants.map((variant) => {
      if (!variant?.id || variant.manage_inventory === false) {
        return variant;
      }

      const variantAvailability = availability[variant.id];

      if (!variantAvailability) {
        return variant;
      }

      return {
        ...variant,
        inventory_quantity: variantAvailability.availability,
      };
    }),
  };
}

export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const { id } = req.params;
  const query = req.scope.resolve("query");
  const { currency_code, region_id } = req.query;
  const salesChannelId = req.publishable_key_context?.sales_channel_ids?.[0];

  const { data } = await query.graph(
    {
      entity: "bundle",
      fields: [
        "*",
        "product.*",
        "product.options.*",
        "product.options.values.*",
        "product.variants.*",
        "product.variants.prices.*",
        "product.variants.calculated_price.*",
        "product.variants.options.*",
        "items.*",
        "items.product.*",
        "items.product.options.*",
        "items.product.options.values.*",
        "items.product.variants.*",
        "items.product.variants.prices.*",
        "items.product.variants.calculated_price.*",
        "items.product.variants.options.*",
      ],
      filters: {
        id,
      },
      context: {
        product: {
          variants: {
            calculated_price: QueryContext({
              region_id,
              currency_code,
            }),
          },
        },
        items: {
          product: {
            variants: {
              calculated_price: QueryContext({
                region_id,
                currency_code,
              }),
            },
          },
        },
      },
    },
    {
      throwIfKeyNotFound: true,
    }
  );

  const bundle = data[0] as BundleRouteBundle | undefined;
  const variantIds = [
    ...(bundle?.product?.variants?.map((variant) => variant.id) ?? []),
    ...(bundle?.items?.flatMap((item) =>
      item.product?.variants?.map((variant) => variant.id) ?? []
    ) ?? []),
  ];

  const availability =
    salesChannelId && variantIds.length > 0
      ? await getVariantAvailability(query, {
          variant_ids: variantIds,
          sales_channel_id: salesChannelId,
        })
      : {};

  const bundleWithAvailability = bundle
    ? {
        ...bundle,
        product: withAvailability(bundle.product, availability),
        items:
          bundle.items?.map((item) => ({
            ...item,
            product: withAvailability(item.product, availability),
          })) ?? [],
      }
    : bundle;

  res.json({
    bundle_product: bundleWithAvailability,
  });
}
