import { model } from "@medusajs/framework/utils";

export enum ProductRegistrationStatus {
  AVAILABLE = "available",
  CLAIMED = "claimed",
  REVOKED = "revoked",
}

export enum ProductRegistrationSource {
  SERIAL_IMPORT = "serial_import",
  STAFF_ASSIGNED = "staff_assigned",
  CUSTOMER_CLAIMED = "customer_claimed",
}

export const ProductRegistration = model
  .define("product_registration", {
    id: model.id().primaryKey(),
    serial_number: model.text(),
    medusa_product_id: model.text().index(),
    customer_id: model.text().nullable(),
    order_id: model.text().nullable(),
    status: model
      .enum(Object.values(ProductRegistrationStatus))
      .default(ProductRegistrationStatus.AVAILABLE),
    source: model
      .enum(Object.values(ProductRegistrationSource))
      .default(ProductRegistrationSource.SERIAL_IMPORT),
    claimed_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      on: ["serial_number", "medusa_product_id"],
    },
    {
      on: ["customer_id", "status"],
    },
  ]);
