import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260402143000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "preorder_variant" add column if not exists "raw_preorder_price" numeric null;`
    );
    this.addSql(
      `update "preorder_variant" set "raw_preorder_price" = "preorder_price" where "raw_preorder_price" is null and "preorder_price" is not null;`
    );
    this.addSql(
      `alter table if exists "preorder_variant" drop column if exists "preorder_price";`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "preorder_variant" add column if not exists "preorder_price" numeric null;`
    );
    this.addSql(
      `update "preorder_variant" set "preorder_price" = "raw_preorder_price" where "preorder_price" is null and "raw_preorder_price" is not null;`
    );
    this.addSql(
      `alter table if exists "preorder_variant" drop column if exists "raw_preorder_price";`
    );
  }
}
