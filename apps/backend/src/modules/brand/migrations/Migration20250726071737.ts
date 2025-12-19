import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20250726071737 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brand" add column if not exists "handle" text not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop column if exists "handle";`);
  }

}
