import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260519000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_registration" ("id" text not null, "serial_number" text not null, "medusa_product_id" text not null, "customer_id" text null, "order_id" text null, "status" text check ("status" in ('available', 'claimed', 'revoked')) not null default 'available', "source" text check ("source" in ('serial_import', 'staff_assigned', 'customer_claimed')) not null default 'serial_import', "claimed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_registration_pkey" primary key ("id"));`);
    this.addSql(`create index if not exists "IDX_product_registration_product_id" on "product_registration" ("medusa_product_id") where "deleted_at" is null;`);
    this.addSql(`create index if not exists "IDX_product_registration_customer_id" on "product_registration" ("customer_id") where "deleted_at" is null;`);
    this.addSql(`create index if not exists "IDX_product_registration_order_id" on "product_registration" ("order_id") where "deleted_at" is null;`);
    this.addSql(`create index if not exists "IDX_product_registration_customer_status" on "product_registration" ("customer_id", "status") where "deleted_at" is null;`);
    this.addSql(`create unique index if not exists "IDX_product_registration_active_serial_owner" on "product_registration" ("serial_number", "medusa_product_id") where "deleted_at" is null and "status" in ('available', 'claimed');`);

    this.addSql(`create table if not exists "product_entitlement_file" ("id" text not null, "medusa_product_id" text not null, "title" text not null, "document_type" text check ("document_type" in ('firmware', 'calibration_file', 'service_manual', 'software', 'other')) not null default 'other', "file_key" text not null, "file_name" text null, "mime_type" text null, "file_size" integer null, "version" text null, "release_notes" text null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_entitlement_file_pkey" primary key ("id"));`);
    this.addSql(`create index if not exists "IDX_product_entitlement_file_product_id" on "product_entitlement_file" ("medusa_product_id") where "deleted_at" is null;`);
    this.addSql(`create index if not exists "IDX_product_entitlement_file_active" on "product_entitlement_file" ("is_active") where "deleted_at" is null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_entitlement_file" cascade;`);
    this.addSql(`drop table if exists "product_registration" cascade;`);
  }
}
