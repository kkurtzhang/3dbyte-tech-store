import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260517000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "email_sender_profile" ("id" text not null, "key" text not null, "label" text not null, "description" text not null, "from" text not null, "reply_to" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_sender_profile_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_email_sender_profile_key" ON "email_sender_profile" ("key") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "email_sender_profile" cascade;`);
  }
}
