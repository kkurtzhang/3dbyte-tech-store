import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import {
  PostAdminCreateBrand,
  PostAdminLinkProductsToBrand,
  PostAdminUpdateBrand,
  DeleteAdminLinkProductsBrand,
  DeleteAdminBatchLinkProductsBrand,
} from "./admin/brands/validators";
import { z } from "@medusajs/framework/zod";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";
import { storeSearchRoutesMiddlewares } from "./store/search/middlewares";
import { storeAddressAutocompleteMiddlewares } from "./store/addresses/autocomplete/middlewares";
import { storeLocalityAutocompleteMiddlewares } from "./store/localities/autocomplete/middlewares";
import { UpsertPreorderVariantSchema } from "./admin/variants/[id]/preorders/route";
import { AddPricedLineItemSchema } from "./store/carts/[id]/line-items-priced/route";
import { PostAdminCreateBundledProduct } from "./admin/bundled-products/validators";
import {
  PostStoreCartLineItemBundles,
  PutStoreCartLineItemBundle,
} from "./store/carts/[id]/line-item-bundles/validators";
import {
  PostAdminEmailSenderProfileTest,
  PutAdminEmailSenderProfile,
} from "./admin/email-settings/validators";

export const GetBrandsSchema = createFindParams();

export default defineMiddlewares({
  routes: [
    // Media Manager plugin authentication
    {
      matcher: "/admin/media*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/meilisearch*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/email-settings*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/email-settings/profiles/:key",
      methods: ["PUT"],
      middlewares: [validateAndTransformBody(PutAdminEmailSenderProfile)],
    },
    {
      matcher: "/admin/email-settings/profiles/:key/test",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(PostAdminEmailSenderProfileTest)],
    },
    {
      matcher: "/admin/brands",
      method: "POST",
      middlewares: [validateAndTransformBody(PostAdminCreateBrand)],
    },
    {
      matcher: "/admin/bundled-products",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(PostAdminCreateBundledProduct)],
    },
    {
      matcher: "/admin/bundled-products",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(createFindParams(), {
          defaults: [
            "id",
            "title",
            "product.*",
            "items.*",
            "items.product.*",
          ],
          isList: true,
          defaultLimit: 15,
        }),
      ],
    },
    {
      matcher: "/admin/products",
      method: ["POST"],
      additionalDataValidator: {
        brand_id: z.string().optional(),
      },
    },
    {
      matcher: "/admin/brands",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(GetBrandsSchema, {
          defaults: ["id", "name", "handle", "products.*"],
          isList: true,
        }),
      ],
    },
    {
      matcher: "/admin/brands/:id",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(GetBrandsSchema, {
          defaults: [
            "id",
            "name",
            "handle",
            "created_at",
            "updated_at",
            "products.*",
          ],
          isList: true,
        }),
      ],
    },
    {
      matcher: "/admin/brands/:id",
      methods: ["PUT"],
      middlewares: [validateAndTransformBody(PostAdminUpdateBrand)],
    },
    {
      matcher: "/admin/brands/:id/products",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(PostAdminLinkProductsToBrand)],
    },
    {
      matcher: "/admin/brands/:id/products",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(createFindParams(), {
          isList: true,
        }),
      ],
    },
    {
      matcher: "/admin/brands/:id/products",
      methods: ["DELETE"],
      middlewares: [validateAndTransformBody(DeleteAdminLinkProductsBrand)],
    },
    {
      matcher: "/admin/variants/:id/preorders",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(UpsertPreorderVariantSchema)],
    },
    {
      matcher: "/admin/brands/products",
      methods: ["DELETE"],
      middlewares: [
        validateAndTransformBody(DeleteAdminBatchLinkProductsBrand),
      ],
    },
    {
      matcher: "/store/carts/:id/line-items-priced",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(AddPricedLineItemSchema)],
    },
    ...storeSearchRoutesMiddlewares,
    ...storeAddressAutocompleteMiddlewares,
    ...storeLocalityAutocompleteMiddlewares,
    // Wishlist routes
    {
      matcher: "/store/wishlist",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/waitlist",
      methods: ["GET", "DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/waitlist",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    {
      matcher: "/admin/waitlist*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/store/carts/:id/line-item-bundles",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(PostStoreCartLineItemBundles)],
    },
    {
      matcher: "/store/carts/:id/line-item-bundles/:bundle_id",
      methods: ["PUT"],
      middlewares: [validateAndTransformBody(PutStoreCartLineItemBundle)],
    },
    {
      matcher: "/store/wishlist/:id",
      methods: ["DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/waitlist/:id",
      methods: ["DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/admin/shipping-rates",
      methods: ["POST"],
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/fulfillments/:id/label",
      methods: ["POST"],
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
  ],
});
