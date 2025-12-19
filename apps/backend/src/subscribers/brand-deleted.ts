import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { STRAPI_MODULE, StrapiModuleService } from "../modules/strapi";

export default async function brandDeletedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger");

  try {
    // Resolve the Strapi service
    const strapiService: StrapiModuleService = container.resolve(STRAPI_MODULE);

    logger.info(`Processing brand.deleted event for brand: ${data.id}`);

    // Delete Brand description in Strapi
    await strapiService.deleteBrandDescription(data.id);

  } catch (error) {
    logger.error(
      `Failed to handle brand.deleted event for ${data.id}`,
      new Error(error.message)
    );
    // Optionally implement retry logic or dead letter queue here
  }
}

export const config: SubscriberConfig = {
  event: "brand.deleted",
};
