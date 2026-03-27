import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { STRAPI_MODULE, StrapiModuleService } from "../../modules/strapi";

export default async function collectionDeletedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger");

  try {
    const strapiService: StrapiModuleService = container.resolve(STRAPI_MODULE);

    logger.info(`Processing product-collection.deleted event for collection: ${data.id}`);

    await strapiService.markCollectionDescriptionDeleted(data.id);
  } catch (error) {
    logger.error(
      `Failed to handle product-collection.deleted event for ${data.id}`,
      new Error(error.message)
    );
  }
}

export const config: SubscriberConfig = {
  event: "product-collection.deleted",
};
