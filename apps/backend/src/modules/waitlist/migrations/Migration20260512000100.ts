import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260512000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "waitlist_entry" ("id" text not null, "customer_id" text not null, "customer_email" text not null, "product_id" text not null, "product_variant_id" text null, "product_handle" text not null, "product_title" text not null, "variant_title" text null, "notified" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "waitlist_entry_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_waitlist_entry_customer_id" ON "waitlist_entry" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_waitlist_entry_product_id" ON "waitlist_entry" (product_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_waitlist_entry_customer_product_variant" ON "waitlist_entry" (customer_id, product_id, COALESCE(product_variant_id, '')) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "waitlist_entry" cascade;`);
  }
}
