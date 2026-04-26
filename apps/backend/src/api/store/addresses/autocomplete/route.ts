import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { MeilisearchAddressDocument } from "@3dbyte-tech-store/shared-types";

import type MeilisearchModuleService from "../../../../modules/meilisearch/service";
import type { StoreAddressAutocompleteParamsType } from "./validators";

const SEARCH_UNAVAILABLE_MESSAGE =
  "Address search is temporarily unavailable";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const meilisearchService =
    req.scope.resolve<MeilisearchModuleService>("meilisearchModuleService");
  const { q, limit, country } =
    req.validatedQuery as StoreAddressAutocompleteParamsType;

  try {
    const filter = country ? [`country = "${country}"`] : undefined;
    const results =
      await meilisearchService.search<MeilisearchAddressDocument>(
        q,
        "address",
        {
          limit,
          filter,
        }
      );

    res.json({
      addresses: results.hits,
      count: results.estimatedTotalHits,
      processingTimeMs: results.processingTimeMs,
    });
  } catch {
    res.status(500).json({
      message: "Failed to search addresses",
      error: SEARCH_UNAVAILABLE_MESSAGE,
    });
  }
}
