import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { syncProductToStrapiWorkflow } from "../workflows/strapi/sync-product-to-strapi";

export default async function productCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await syncProductToStrapiWorkflow(container).run({
    input: data,
  });
}

export const config: SubscriberConfig = {
  event: "product.created",
};
