import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260401140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "preorder_variant" ("id" text not null, "variant_id" text not null, "available_date" timestamptz not null, "status" text not null default 'enabled', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "preorder_variant_pkey" primary key ("id"));`
    );
    this.addSql(
      `alter table if exists "preorder_variant" add constraint "preorder_variant_variant_id_unique" unique ("variant_id");`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_preorder_variant_available_date" ON "preorder_variant" (available_date);`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_preorder_variant_deleted_at" ON "preorder_variant" (deleted_at) WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "preorder" ("id" text not null, "order_id" text not null, "item_id" text not null, "status" text not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "preorder_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_preorder_item_status" ON "preorder" (item_id, status);`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_preorder_deleted_at" ON "preorder" (deleted_at) WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "preorder" cascade;`);
    this.addSql(`drop table if exists "preorder_variant" cascade;`);
  }
}
