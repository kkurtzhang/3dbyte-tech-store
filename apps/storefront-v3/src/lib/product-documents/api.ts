import { sdk } from "@/lib/medusa/client";
import type { PublicProductDocument } from "./types";

export async function getPublicProductDocuments(
  productId: string,
): Promise<PublicProductDocument[]> {
  try {
    const response = await sdk.client.fetch<{
      documents: PublicProductDocument[];
    }>(`/store/products/${productId}/documents`, {
      method: "GET",
    });

    return response.documents;
  } catch (error) {
    console.warn(`Failed to load product documents for ${productId}`, error);
    return [];
  }
}
