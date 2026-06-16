import {
  MiddlewareRoute,
  validateAndTransformQuery,
} from "@medusajs/framework";

import { storeAddressAutocompleteRateLimit } from "../../../../lib/rate-limits/api-rules";
import { StoreAddressAutocompleteParams } from "./validators";

export const storeAddressAutocompleteMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/addresses/autocomplete",
    middlewares: [
      storeAddressAutocompleteRateLimit,
      validateAndTransformQuery(StoreAddressAutocompleteParams, {
        isList: false,
      }),
    ],
  },
];
