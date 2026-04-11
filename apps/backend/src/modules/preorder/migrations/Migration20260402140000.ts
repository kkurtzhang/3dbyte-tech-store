import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260402140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "preorder_variant" add column if not exists "preorder_price" numeric null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "preorder_variant" drop column if exists "preorder_price";`
    );
  }
}
