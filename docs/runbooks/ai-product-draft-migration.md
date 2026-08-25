# AI Product Draft Migration Runbook

This runbook repairs legacy and target-mismatch AI product drafts in staging
without approving or importing products. The migration is an application-level
Medusa script; do not replace it with direct SQL.

## Safety model

- `plan` is the default and never writes.
- `apply` requires the exact manifest hash produced by the current plan.
- `cleanup` is separate from repair and requires the recorded migration run ID.
- Existing draft IDs and `raw_packet` evidence are preserved.
- A live product identity check runs immediately before every repair. A possible
  match moves to `needs_resolution`; it is never forced into a create import.
- Cleanup soft-deletes only duplicates recorded by the apply run and the exact
  unlinked `Example PETG Filament` fixture.

## 1. Deploy and verify

Merge the reviewed change into `staging` and wait for Coolify to deploy it.
Verify `/api/health` reports the merged commit as `releaseSha`, and confirm that
a current staging PostgreSQL backup exists before applying data changes.

Connect to the OCI host and resolve the current Medusa container:

```bash
ssh oci-app
medusa_container=$(sudo docker ps --filter "name=medusa-" --format '{{.Names}}' | head -n1)
sudo docker inspect "$medusa_container" --format '{{.Config.Image}} {{.Config.WorkingDir}}'
```

The deployed build runs from `/opt/apps/backend/.medusa/server`, and custom
scripts are compiled from TypeScript to JavaScript under `src/scripts`.

## 2. Generate the read-only plan

```bash
sudo docker exec "$medusa_container" sh -lc \
  'AI_PRODUCT_DRAFT_MIGRATION_MODE=plan npx medusa exec ./src/scripts/migrate-ai-product-drafts.js'
```

Save the final JSON report. Review `repairs`, `duplicates`, `unrecoverable`,
`manifest_hash`, and `run_id`. Re-run the plan if the queue changes.

## 3. Apply repairs

Replace `<manifest-hash>` with the exact plan output:

```bash
sudo docker exec "$medusa_container" sh -lc \
  'AI_PRODUCT_DRAFT_MIGRATION_MODE=apply AI_PRODUCT_DRAFT_MIGRATION_CONFIRM=<manifest-hash> npx medusa exec ./src/scripts/migrate-ai-product-drafts.js'
```

After apply:

1. Confirm repaired drafts appear in `needs_review` or `needs_resolution`.
2. Confirm the original raw packets remain present.
3. Review, approve, and import the Polymaker draft through Admin.
4. Verify the created Medusa product is unpublished and the draft contains an
   import summary and completed audit event.
5. Repeat with one recovered v2 draft and check for duplicate products.

Do not run cleanup until these checks pass.

## 4. Conservative cleanup

Replace `<run-id>` with the apply report's exact `run_id`:

```bash
sudo docker exec "$medusa_container" sh -lc \
  'AI_PRODUCT_DRAFT_MIGRATION_MODE=cleanup AI_PRODUCT_DRAFT_MIGRATION_RUN_ID=<run-id> AI_PRODUCT_DRAFT_MIGRATION_CLEANUP_CONFIRM=<run-id> npx medusa exec ./src/scripts/migrate-ai-product-drafts.js'
```

Inspect `cleaned_ids`, then run `plan` again. A successful completed migration
reports no remaining repairs. Unrecoverable legacy packets remain in
`validation_failed` for explicit later disposition.

## Recovery

The repair is forward-only. If an applied draft needs correction, use its
preserved `raw_packet` and `legacy_migrated` event to issue a corrected forward
repair. Restore soft-deleted cleanup records from the pre-apply database backup
if the canonical mapping is found to be wrong.
