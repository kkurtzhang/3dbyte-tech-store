import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { updateProductToStrapiWorkflow } from "../../workflows/strapi/update-product-to-strapi";

export default async function productUpdatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await updateProductToStrapiWorkflow(container).run({
    input: data,
  });
}

export const config: SubscriberConfig = {
  event: "product.updated",
};
