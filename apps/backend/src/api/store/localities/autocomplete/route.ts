import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { MeilisearchLocalityDocument } from "@3dbyte-tech-store/shared-types";

import { MEILISEARCH_MODULE } from "../../../../modules/meilisearch";
import type MeilisearchModuleService from "../../../../modules/meilisearch/service";
import type { StoreLocalityAutocompleteParamsType } from "./validators";

const SEARCH_UNAVAILABLE_MESSAGE =
  "Locality search is temporarily unavailable";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const meilisearchService =
    req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);
  const { q, limit, country, state } =
    req.validatedQuery as StoreLocalityAutocompleteParamsType;

  try {
    const filter = [
      country ? `country = "${country}"` : undefined,
      state ? `state = "${state}"` : undefined,
    ].filter((item): item is string => Boolean(item));
    const results =
      await meilisearchService.search<MeilisearchLocalityDocument>(
        q,
        "locality",
        {
          limit,
          filter: filter.length > 0 ? filter : undefined,
        },
      );

    res.json({
      localities: results.hits,
      count: results.estimatedTotalHits,
      processingTimeMs: results.processingTimeMs,
    });
  } catch {
    res.status(500).json({
      message: "Failed to search localities",
      error: SEARCH_UNAVAILABLE_MESSAGE,
    });
  }
}
