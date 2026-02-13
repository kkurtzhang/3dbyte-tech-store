import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260212125417 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "newsletter_subscriber" drop constraint if exists "newsletter_subscriber_status_check";`);

    this.addSql(`alter table if exists "newsletter_subscriber" alter column "status" type text using ("status"::text);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "newsletter_subscriber" add constraint "newsletter_subscriber_status_check" check("status" in ('active', 'unsubscribed'));`);
  }

}
