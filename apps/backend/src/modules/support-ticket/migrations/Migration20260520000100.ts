import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260520000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "support_ticket" ("id" text not null, "ticket_number" text not null, "status" text not null default 'new', "priority" text not null default 'normal', "category" text not null default 'general', "source" text not null default 'contact_form', "subject" text not null, "customer_name" text not null, "customer_email" text not null, "customer_id" text null, "order_id" text null, "order_reference" text null, "product_id" text null, "product_handle" text null, "assigned_admin_id" text null, "ai_summary" text null, "metadata" jsonb null, "last_message_at" timestamptz null, "resolved_at" timestamptz null, "closed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "support_ticket_pkey" primary key ("id"));`)
    this.addSql(`create unique index if not exists "IDX_support_ticket_ticket_number" on "support_ticket" ("ticket_number") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_support_ticket_status" on "support_ticket" ("status") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_support_ticket_customer_email" on "support_ticket" ("customer_email") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_support_ticket_source" on "support_ticket" ("source") where deleted_at is null;`)

    this.addSql(`create table if not exists "support_ticket_message" ("id" text not null, "ticket_id" text not null, "author_type" text not null, "direction" text not null, "visibility" text not null default 'customer', "body" text not null, "author_name" text null, "author_email" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "support_ticket_message_pkey" primary key ("id"));`)
    this.addSql(`create index if not exists "IDX_support_ticket_message_ticket_id" on "support_ticket_message" ("ticket_id") where deleted_at is null;`)

    this.addSql(`create table if not exists "support_ticket_event" ("id" text not null, "ticket_id" text not null, "type" text not null, "from_value" text null, "to_value" text null, "actor_type" text not null default 'system', "actor_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "support_ticket_event_pkey" primary key ("id"));`)
    this.addSql(`create index if not exists "IDX_support_ticket_event_ticket_id" on "support_ticket_event" ("ticket_id") where deleted_at is null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "support_ticket_event" cascade;`)
    this.addSql(`drop table if exists "support_ticket_message" cascade;`)
    this.addSql(`drop table if exists "support_ticket" cascade;`)
  }
}
