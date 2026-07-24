import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260724000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "ai_product_draft"
        add column if not exists "request_id" text null,
        add column if not exists "requested_operation" text null,
        add column if not exists "resolved_operation" text null,
        add column if not exists "resolution_status" text null,
        add column if not exists "identity_candidates" jsonb null,
        add column if not exists "current_snapshot" jsonb null,
        add column if not exists "snapshot_hash" text null,
        add column if not exists "proposed_changes" jsonb null,
        add column if not exists "approved_changes" jsonb null,
        add column if not exists "approved_import_targets" jsonb null,
        add column if not exists "approved_snapshot_hash" text null,
        add column if not exists "import_progress" jsonb null;`
    )
    this.addSql(
      `create unique index if not exists "IDX_ai_product_draft_source_request" on "ai_product_draft" ("source_agent", "request_id") where "deleted_at" is null and "request_id" is not null;`
    )
    this.addSql(
      `create index if not exists "IDX_ai_product_draft_resolution_status" on "ai_product_draft" ("resolution_status") where "deleted_at" is null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `drop index if exists "IDX_ai_product_draft_resolution_status";`
    )
    this.addSql(`drop index if exists "IDX_ai_product_draft_source_request";`)
    this.addSql(
      `alter table if exists "ai_product_draft"
        drop column if exists "request_id",
        drop column if exists "requested_operation",
        drop column if exists "resolved_operation",
        drop column if exists "resolution_status",
        drop column if exists "identity_candidates",
        drop column if exists "current_snapshot",
        drop column if exists "snapshot_hash",
        drop column if exists "proposed_changes",
        drop column if exists "approved_changes",
        drop column if exists "approved_import_targets",
        drop column if exists "approved_snapshot_hash",
        drop column if exists "import_progress";`
    )
  }
}
