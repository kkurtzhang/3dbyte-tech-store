import type { MedusaContainer } from "@medusajs/framework/types";
import { documentKnowledgeDependencies } from "../lib/product-document-knowledge/lifecycle";
import { trackReconciliation } from "../lib/product-document-knowledge/recovery";
import { reconcileProductDocuments } from "../lib/product-document-knowledge/synchronize";

/** Repairs missed webhook events and removes expired/withdrawn derived content. */
export default async function syncProductDocuments(container: MedusaContainer) {
  if (process.env.PRODUCT_DOCUMENT_SYNC_ENABLED !== "true") return;
  await trackReconciliation(
    "sync-product-documents",
    container.resolve("logger"),
    () => reconcileProductDocuments(documentKnowledgeDependencies(container)),
  );
}
export const config = {
  name: "sync-product-documents",
  schedule: "*/5 * * * *",
};
