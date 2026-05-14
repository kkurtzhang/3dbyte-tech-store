import { z } from "@medusajs/framework/zod";

const AUSTRALIAN_STATES = [
  "ACT",
  "NSW",
  "NT",
  "QLD",
  "SA",
  "TAS",
  "VIC",
  "WA",
] as const;

export const StoreLocalityAutocompleteParams = z.object({
  q: z.string().trim().min(2, "Query must be at least 2 characters"),
  limit: z.coerce.number().int().min(1).max(10).default(8),
  country: z.enum(["AU", "NZ"]).optional(),
  state: z.enum(AUSTRALIAN_STATES).optional(),
});

export type StoreLocalityAutocompleteParamsType = z.infer<
  typeof StoreLocalityAutocompleteParams
>;
