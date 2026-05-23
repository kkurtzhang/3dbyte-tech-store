import { MedusaError, MedusaService } from "@medusajs/framework/utils";
import { ProductEntitlementFile } from "./models/product-entitlement-file";
import {
  ProductRegistration,
  ProductRegistrationSource,
  ProductRegistrationStatus,
} from "./models/product-registration";
import type {
  ClaimProductSerialInput,
  CreateEntitledDownloadLinkInput,
  CustomerProductFile,
  ProductEntitlementFileRecord,
  ProductFileDownload,
  ProductRegistrationRecord,
} from "./types";

export function normalizeSerialNumber(serialNumber: string): string {
  return serialNumber.trim().toUpperCase();
}

class ProductFilesModuleService extends MedusaService({
  ProductEntitlementFile,
  ProductRegistration,
}) {
  async claimProductSerial(
    input: ClaimProductSerialInput,
  ): Promise<ProductRegistrationRecord> {
    const serialNumber = normalizeSerialNumber(input.serialNumber);

    if (!serialNumber || !input.medusaProductId || !input.customerId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "serialNumber, medusaProductId, and customerId are required",
      );
    }

    const registrations = (await this.listProductRegistrations({
      serial_number: serialNumber,
      medusa_product_id: input.medusaProductId,
    })) as ProductRegistrationRecord[];
    const registration = registrations[0];

    if (!registration) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Product serial was not found",
      );
    }

    if (registration.status === ProductRegistrationStatus.REVOKED) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Product serial has been revoked",
      );
    }

    if (
      registration.status === ProductRegistrationStatus.CLAIMED &&
      registration.customer_id &&
      registration.customer_id !== input.customerId
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Product serial is already claimed",
      );
    }

    if (
      registration.status === ProductRegistrationStatus.CLAIMED &&
      registration.customer_id === input.customerId
    ) {
      return registration;
    }

    return (await this.updateProductRegistrations({
      id: registration.id,
      serial_number: serialNumber,
      customer_id: input.customerId,
      order_id: input.orderId ?? registration.order_id ?? null,
      status: ProductRegistrationStatus.CLAIMED,
      source: ProductRegistrationSource.CUSTOMER_CLAIMED,
      claimed_at: new Date(),
    })) as ProductRegistrationRecord;
  }

  async listCustomerProductFiles(
    customerId: string,
  ): Promise<CustomerProductFile[]> {
    const registrations = (await this.listProductRegistrations({
      customer_id: customerId,
      status: ProductRegistrationStatus.CLAIMED,
    })) as ProductRegistrationRecord[];

    const registrationsByProductId = new Map(
      registrations.map((registration) => [
        registration.medusa_product_id,
        registration,
      ]),
    );
    const productIds = Array.from(registrationsByProductId.keys());

    if (productIds.length === 0) {
      return [];
    }

    const files = (await this.listProductEntitlementFiles({
      medusa_product_id: productIds,
      is_active: true,
    })) as ProductEntitlementFileRecord[];

    return files
      .map((file) => {
        const registration = registrationsByProductId.get(
          file.medusa_product_id,
        );

        return registration ? { ...file, registration } : null;
      })
      .filter((file): file is CustomerProductFile => Boolean(file));
  }

  async createEntitledDownloadLink(
    input: CreateEntitledDownloadLinkInput,
  ): Promise<ProductFileDownload> {
    const files = (await this.listProductEntitlementFiles({
      id: input.fileId,
      is_active: true,
    })) as ProductEntitlementFileRecord[];
    const file = files[0];

    if (!file) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Product file was not found",
      );
    }

    const registrations = (await this.listProductRegistrations({
      customer_id: input.customerId,
      medusa_product_id: file.medusa_product_id,
      status: ProductRegistrationStatus.CLAIMED,
    })) as ProductRegistrationRecord[];

    if (registrations.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Customer is not entitled to this product file",
      );
    }

    const fileData = input.retrieveFile
      ? await input.retrieveFile(file.file_key)
      : null;

    return {
      url: fileData?.url || file.file_key,
      expires_in: 900,
    };
  }
}

export default ProductFilesModuleService;
