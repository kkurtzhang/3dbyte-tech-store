import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { updateCollectionToStrapiWorkflow } from "../../workflows/strapi/update-collection-to-strapi";

export default async function collectionUpdatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await updateCollectionToStrapiWorkflow(container).run({
    input: data,
  });
}

export const config: SubscriberConfig = {
  event: "product-collection.updated",
};
