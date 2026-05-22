"use server";

import { revalidatePath } from "next/cache";
import { getCustomerAuthHeaders } from "@/app/actions/auth";
import { sdk } from "@/lib/medusa/client";
import type { CustomerProductFile } from "@/lib/product-documents/types";

type ProductFilesResult =
  | { success: true; productFiles: CustomerProductFile[] }
  | { success: false; error: string; requiresAuth?: boolean };

type ProductRegistrationResult =
  | { success: true; registration: { id: string; serial_number: string } }
  | { success: false; error: string; requiresAuth?: boolean };

type ProductFileDownloadResult =
  | { success: true; url: string }
  | { success: false; error: string; requiresAuth?: boolean };

const authRequired = {
  success: false as const,
  requiresAuth: true,
  error: "Sign in to manage your product files.",
};

export async function getCustomerProductFilesAction(): Promise<ProductFilesResult> {
  const authHeaders = await getCustomerAuthHeaders();
  if (!authHeaders) {
    return authRequired;
  }

  try {
    const response = await sdk.client.fetch<{
      product_files: CustomerProductFile[];
    }>("/store/customers/me/product-files", {
      method: "GET",
      headers: authHeaders,
    });

    return {
      success: true,
      productFiles: response.product_files,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load product files.",
    };
  }
}

export async function claimProductSerialAction(
  _previousState: ProductRegistrationResult | null,
  formData: FormData,
): Promise<ProductRegistrationResult> {
  const authHeaders = await getCustomerAuthHeaders();
  if (!authHeaders) {
    return authRequired;
  }

  const serialNumber = String(formData.get("serial_number") || "").trim();
  const medusaProductId = String(formData.get("medusa_product_id") || "").trim();

  if (!serialNumber || !medusaProductId) {
    return {
      success: false,
      error: "Serial number and product ID are required.",
    };
  }

  try {
    const response = await sdk.client.fetch<{
      registration: { id: string; serial_number: string };
    }>("/store/customers/me/product-registrations", {
      method: "POST",
      headers: authHeaders,
      body: {
        serial_number: serialNumber,
        medusa_product_id: medusaProductId,
      },
    });

    revalidatePath("/account/product-files");
    revalidatePath("/account/product-registrations");

    return {
      success: true,
      registration: response.registration,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to register product.",
    };
  }
}

export async function createProductFileDownloadAction(
  fileId: string,
): Promise<ProductFileDownloadResult> {
  const authHeaders = await getCustomerAuthHeaders();
  if (!authHeaders) {
    return authRequired;
  }

  try {
    const response = await sdk.client.fetch<{
      download: { url: string };
    }>(`/store/customers/me/product-files/${fileId}/download`, {
      method: "POST",
      headers: authHeaders,
    });

    return {
      success: true,
      url: response.download.url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create download.",
    };
  }
}
