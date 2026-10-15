import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261015053100 extends Migration {
  override isTransactional(): boolean {
    return false;
  }
  override async up(): Promise<void> {
    // No IF NOT EXISTS: a failed concurrent build may leave an invalid index;
    // a retry must fail visibly until an operator inspects that index.
    this.addSql(
      'create unique index concurrently "IDX_support_ticket_ai_consent_proposal" on "support_ticket" ("ai_consent_proposal_id") where ai_consent_proposal_id is not null and (deleted_at is null or deleted_at is not null);',
    );
  }
  override async down(): Promise<void> {
    throw new Error(
      "Consent uniqueness is a security invariant; retain it on application rollback",
    );
  }
}
