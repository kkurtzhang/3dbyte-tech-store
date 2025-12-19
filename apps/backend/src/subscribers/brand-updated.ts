import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { updateBrandToStrapiWorkflow } from "../workflows/strapi/update-brand-to-strapi";

export default async function brandUpdatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await updateBrandToStrapiWorkflow(container).run({
    input: data,
  });
}

export const config: SubscriberConfig = {
  event: "brand.updated",
};
