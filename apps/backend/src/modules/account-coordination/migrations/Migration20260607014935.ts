import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260607014935 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "account_security_event" ("id" text not null, "customer_id" text null, "event_type" text not null, "provider" text null, "severity" text not null default 'info', "ip_hash" text null, "user_agent_hash" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "account_security_event_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_account_security_event_deleted_at" ON "account_security_event" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_account_security_event_customer_created" ON "account_security_event" ("customer_id", "created_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_account_security_event_type_created" ON "account_security_event" ("event_type", "created_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "guest_consolidation_run" ("id" text not null, "canonical_customer_id" text not null, "normalized_email" text not null, "idempotency_key" text not null, "mode" text not null, "status" text not null default 'pending', "guest_customer_ids" jsonb null, "transferred_order_ids" jsonb null, "attached_cart_ids" jsonb null, "attached_support_ticket_ids" jsonb null, "skipped_items" jsonb null, "profile_fields_filled" jsonb null, "summary" jsonb null, "started_at" timestamptz not null, "completed_at" timestamptz null, "failure_reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "guest_consolidation_run_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_guest_consolidation_run_deleted_at" ON "guest_consolidation_run" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_guest_consolidation_run_idempotency" ON "guest_consolidation_run" ("idempotency_key") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_guest_consolidation_run_customer_status" ON "guest_consolidation_run" ("canonical_customer_id", "status") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "identity_conflict" ("id" text not null, "customer_id" text null, "normalized_email" text null, "provider" text null, "issue_type" text not null, "status" text not null default 'open', "occurrence_count" integer not null default 1, "last_seen_at" timestamptz not null, "details" jsonb null, "resolved_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "identity_conflict_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_identity_conflict_deleted_at" ON "identity_conflict" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_identity_conflict_status_type" ON "identity_conflict" ("status", "issue_type") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_identity_conflict_email_provider" ON "identity_conflict" ("normalized_email", "provider") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "oauth_link_intent" ("id" text not null, "customer_id" text not null, "expected_email" text not null, "nonce_hash" text not null, "status" text not null default 'pending', "expires_at" timestamptz not null, "used_at" timestamptz null, "failure_count" integer not null default 0, "last_failure_reason" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "oauth_link_intent_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_oauth_link_intent_deleted_at" ON "oauth_link_intent" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_oauth_link_intent_customer_status" ON "oauth_link_intent" ("customer_id", "status") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_oauth_link_intent_status_expires" ON "oauth_link_intent" ("status", "expires_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "account_security_event" cascade;`);

    this.addSql(`drop table if exists "guest_consolidation_run" cascade;`);

    this.addSql(`drop table if exists "identity_conflict" cascade;`);

    this.addSql(`drop table if exists "oauth_link_intent" cascade;`);
  }
}
