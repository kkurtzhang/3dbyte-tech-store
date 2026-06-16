import { MiddlewareRoute } from "@medusajs/framework";
import { validateAndTransformQuery } from "@medusajs/framework";
import { storeSearchRateLimit } from "../../../lib/rate-limits/api-rules";
import { StoreSearchProductsParams } from "./validators";
import { listProductQueryConfig } from "./query-config";

export const storeSearchRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/search",
    middlewares: [
      storeSearchRateLimit,
      validateAndTransformQuery(
        StoreSearchProductsParams,
        listProductQueryConfig,
      ),
    ],
  },
];
