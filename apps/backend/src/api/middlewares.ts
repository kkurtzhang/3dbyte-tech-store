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
import z from "zod";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";
import { storeSearchRoutesMiddlewares } from "./store/search/middlewares";

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
      matcher: "/admin/brands",
      method: "POST",
      middlewares: [validateAndTransformBody(PostAdminCreateBrand)],
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
      matcher: "/admin/brands/products",
      methods: ["DELETE"],
      middlewares: [
        validateAndTransformBody(DeleteAdminBatchLinkProductsBrand),
      ],
    },
    ...storeSearchRoutesMiddlewares,
  ],
});
