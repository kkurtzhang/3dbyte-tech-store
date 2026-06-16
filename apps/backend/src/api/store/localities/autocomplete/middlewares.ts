import {
  MiddlewareRoute,
  validateAndTransformQuery,
} from "@medusajs/framework";

import { storeLocalityAutocompleteRateLimit } from "../../../../lib/rate-limits/api-rules";
import { StoreLocalityAutocompleteParams } from "./validators";

export const storeLocalityAutocompleteMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/localities/autocomplete",
    middlewares: [
      storeLocalityAutocompleteRateLimit,
      validateAndTransformQuery(StoreLocalityAutocompleteParams, {
        isList: false,
      }),
    ],
  },
];
