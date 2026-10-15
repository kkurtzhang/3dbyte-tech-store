import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261015053000 extends Migration {
  // Commit the column before the following concurrent index uses a separate
  // connection, even when MikroORM tracks the batch in a master transaction.
  override isTransactional(): boolean { return false }
  override async up(): Promise<void> {
    this.addSql(
      'alter table "support_ticket" add column if not exists "ai_consent_proposal_id" text null;',
    );
  }
  override async down(): Promise<void> {
    // Retain consent audit/idempotency data on application rollback.
    throw new Error(
      "Consent audit column is forward-only; do not discard submitted proposal IDs",
    );
  }
}
