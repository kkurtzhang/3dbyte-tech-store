import { model } from "@medusajs/framework/utils";

export enum ProductEntitlementFileType {
  FIRMWARE = "firmware",
  CALIBRATION_FILE = "calibration_file",
  SERVICE_MANUAL = "service_manual",
  SOFTWARE = "software",
  OTHER = "other",
}

export const ProductEntitlementFile = model.define(
  "product_entitlement_file",
  {
    id: model.id().primaryKey(),
    medusa_product_id: model.text().index(),
    title: model.text(),
    document_type: model
      .enum(Object.values(ProductEntitlementFileType))
      .default(ProductEntitlementFileType.OTHER),
    file_key: model.text(),
    file_name: model.text().nullable(),
    mime_type: model.text().nullable(),
    file_size: model.number().nullable(),
    version: model.text().nullable(),
    release_notes: model.text().nullable(),
    is_active: model.boolean().default(true),
  },
);
