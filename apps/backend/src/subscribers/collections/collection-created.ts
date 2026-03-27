import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { syncCollectionToStrapiWorkflow } from "../../workflows/strapi/sync-collection-to-strapi";

export default async function collectionCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await syncCollectionToStrapiWorkflow(container).run({
    input: data,
  });
}

export const config: SubscriberConfig = {
  event: "product-collection.created",
};
