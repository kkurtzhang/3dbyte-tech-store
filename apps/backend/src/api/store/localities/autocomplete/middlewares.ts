import { MiddlewareRoute, validateAndTransformQuery } from "@medusajs/framework";

import { StoreLocalityAutocompleteParams } from "./validators";

export const storeLocalityAutocompleteMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/localities/autocomplete",
    middlewares: [
      validateAndTransformQuery(StoreLocalityAutocompleteParams, {
        isList: false,
      }),
    ],
  },
];
