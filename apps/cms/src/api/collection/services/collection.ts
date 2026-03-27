/**
 * collection service
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreService(
  "api::collection.collection",
  ({ strapi }) => ({
    async unpublish(documentId: string) {
      // The checked-in generated Strapi types do not yet include the live sync fields.
      const syncData = {
        sync_status: "deleted",
        last_synced: new Date().toISOString(),
      } as Record<string, unknown>;

      const updatedDraft = await strapi
        .documents("api::collection.collection")
        .update({
          documentId,
          data: syncData as any,
        });

      const unpublishedDocument = await strapi
        .documents("api::collection.collection")
        .unpublish({
          documentId,
        });

      return {
        draft: updatedDraft,
        unpublished: unpublishedDocument,
      };
    },
  }),
);
