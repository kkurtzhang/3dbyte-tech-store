import { MiddlewareRoute, validateAndTransformQuery } from "@medusajs/framework";

import { StoreAddressAutocompleteParams } from "./validators";

export const storeAddressAutocompleteMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/addresses/autocomplete",
    middlewares: [
      validateAndTransformQuery(StoreAddressAutocompleteParams, {
        isList: false,
      }),
    ],
  },
];
