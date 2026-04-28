import { z } from "@medusajs/framework/zod";

export const StoreAddressAutocompleteParams = z.object({
  q: z.string().trim().min(3, "Query must be at least 3 characters"),
  limit: z.coerce.number().int().min(1).max(10).default(8),
  country: z.enum(["AU", "NZ"]).optional(),
});

export type StoreAddressAutocompleteParamsType = z.infer<
  typeof StoreAddressAutocompleteParams
>;
