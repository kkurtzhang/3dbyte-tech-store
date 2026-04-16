import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { QueryContext } from "@medusajs/framework/utils";
import BundleItemProductLink from "../../../../../links/bundle-item-product";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const query = req.scope.resolve("query");
  const { currency_code, region_id } = req.query;

  const { data: linkData } = await query.graph({
    entity: BundleItemProductLink.entryPoint,
    fields: [
      "bundle_item.bundle.id",
    ],
    filters: {
      product_id: id,
    },
  });

  const bundleIds = linkData
    .map(
      (link: {
        bundle_item?: {
          bundle?: {
            id: string;
          } | null;
        } | null;
      }) => link.bundle_item?.bundle,
    )
    .filter((bundle): bundle is { id: string } => Boolean(bundle?.id))
    .map((bundle) => bundle.id)
    .filter((bundleId, index, allBundleIds) => allBundleIds.indexOf(bundleId) === index);

  if (bundleIds.length === 0) {
    res.json({
      bundles: [],
    });
    return;
  }

  const { data } = await query.graph({
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
      id: bundleIds,
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
  });

  const bundles = data.filter(
    (bundle: {
      product?: {
        status?: string;
      } | null;
    }) => bundle.product?.status === "published",
  );

  res.json({
    bundles,
  });
}
