import type { Logger } from "@medusajs/framework/types";
import type { MeilisearchIndexType } from "@3dbyte-tech-store/shared-types";
import type MeilisearchModuleService from "../../../../modules/meilisearch/service";

type DeleteStaleIndexDocumentsInput = {
  currentIds: readonly string[];
  label: string;
  logger: Logger;
  meilisearchService: MeilisearchModuleService;
  type: MeilisearchIndexType;
};

export async function deleteStaleIndexDocuments({
  currentIds,
  label,
  logger,
  meilisearchService,
  type,
}: DeleteStaleIndexDocumentsInput): Promise<number> {
  const currentIdSet = new Set(currentIds.filter(Boolean));
  const existingIds = await meilisearchService.listDocumentIds(type);
  const staleIds = existingIds.filter((id) => !currentIdSet.has(id));

  if (staleIds.length === 0) {
    logger.info(
      `No stale ${label} documents found in Meilisearch (${existingIds.length} existing, ${currentIdSet.size} current)`,
    );
    return 0;
  }

  await meilisearchService.deleteFromIndex(staleIds, type);
  logger.info(
    `Deleted ${staleIds.length} stale ${label} documents from Meilisearch`,
  );

  return staleIds.length;
}
