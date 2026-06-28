import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260628000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "ai_product_draft" ("id" text not null, "status" text not null default 'received', "packet_version" integer not null default 1, "source_agent" text not null default 'hermes', "product_id" text null, "product_handle" text null, "product_input" jsonb null, "source_summary" jsonb null, "raw_packet" jsonb null, "normalized_draft" jsonb null, "sources" jsonb null, "warnings" jsonb null, "confidence_summary" jsonb null, "validation_errors" jsonb null, "normalizer" text null, "normalizer_trace_id" text null, "admin_notes" text null, "rejection_reason" text null, "approved_by" text null, "approved_at" timestamptz null, "rejected_by" text null, "rejected_at" timestamptz null, "imported_by" text null, "imported_at" timestamptz null, "import_summary" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_product_draft_pkey" primary key ("id"));`)
    this.addSql(`create index if not exists "IDX_ai_product_draft_status" on "ai_product_draft" ("status") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_ai_product_draft_product_id" on "ai_product_draft" ("product_id") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_ai_product_draft_product_handle" on "ai_product_draft" ("product_handle") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_ai_product_draft_source_agent" on "ai_product_draft" ("source_agent") where deleted_at is null;`)

    this.addSql(`create table if not exists "ai_product_draft_event" ("id" text not null, "draft_id" text not null, "type" text not null, "actor_type" text not null default 'system', "actor_id" text null, "from_status" text null, "to_status" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_product_draft_event_pkey" primary key ("id"));`)
    this.addSql(`create index if not exists "IDX_ai_product_draft_event_draft_id" on "ai_product_draft_event" ("draft_id") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_ai_product_draft_event_type" on "ai_product_draft_event" ("type") where deleted_at is null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ai_product_draft_event" cascade;`)
    this.addSql(`drop table if exists "ai_product_draft" cascade;`)
  }
}
