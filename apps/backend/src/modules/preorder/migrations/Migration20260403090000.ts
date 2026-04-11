import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260403090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "preorder_variant" add column if not exists "preorder_price" numeric null;`
    );
    this.addSql(
      `update "preorder_variant" set "preorder_price" = "raw_preorder_price" where "preorder_price" is null and "raw_preorder_price" is not null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "preorder_variant" drop column if exists "preorder_price";`
    );
  }
}
