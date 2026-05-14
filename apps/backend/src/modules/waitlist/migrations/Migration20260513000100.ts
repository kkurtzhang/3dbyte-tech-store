import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260513000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "waitlist_entry" alter column "customer_id" drop not null;`)
    this.addSql(`alter table if exists "waitlist_entry" add column if not exists "notified_at" timestamptz null;`)
    this.addSql(`alter table if exists "waitlist_entry" add column if not exists "last_notified_at" timestamptz null;`)
    this.addSql(`alter table if exists "waitlist_entry" add column if not exists "notification_count" integer not null default 0;`)
    this.addSql(`update "waitlist_entry" set "customer_email" = lower(trim("customer_email")) where "customer_email" is not null;`)
    this.addSql(`drop index if exists "IDX_waitlist_entry_customer_product_variant";`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_waitlist_entry_customer_email" ON "waitlist_entry" (customer_email) WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_waitlist_entry_email_product_variant_active" ON "waitlist_entry" (customer_email, product_id, COALESCE(product_variant_id, '')) WHERE deleted_at IS NULL AND notified = false;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_waitlist_entry_email_product_variant_active";`)
    this.addSql(`drop index if exists "IDX_waitlist_entry_customer_email";`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_waitlist_entry_customer_product_variant" ON "waitlist_entry" (customer_id, product_id, COALESCE(product_variant_id, '')) WHERE deleted_at IS NULL;`)
    this.addSql(`alter table if exists "waitlist_entry" drop column if exists "notification_count";`)
    this.addSql(`alter table if exists "waitlist_entry" drop column if exists "last_notified_at";`)
    this.addSql(`alter table if exists "waitlist_entry" drop column if exists "notified_at";`)
    this.addSql(`alter table if exists "waitlist_entry" alter column "customer_id" set not null;`)
  }
}
