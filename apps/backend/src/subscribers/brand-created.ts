import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework";
import { syncBrandToStrapiWorkflow } from "../workflows/strapi/sync-brands-to-strapi";

export default async function brandCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await syncBrandToStrapiWorkflow(container).run({
    input: data,
  });
}

export const config: SubscriberConfig = {
  event: "brand.created",
};
