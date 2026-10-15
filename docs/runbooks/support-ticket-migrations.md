# Support-ticket migration coordination

The support-ticket module opts into `options.migrationLock: "session"` in
`apps/backend/medusa-config.ts`. This is a repository extension to the pinned
Medusa modules SDK, delivered by `patches/@medusajs__modules-sdk@2.15.5.patch`
and pnpm's locked `patchedDependencies`. It is not an upstream Medusa option.
The existing release Dockerfile copies root patches before its frozen install.
No package version changes are required.

## Why both transaction boundaries matter

The module's `run-migrations.ts` disables MikroORM all-or-nothing batching so
migration `20261015053000` commits the proposal column before migration
`20261015053100` creates the concurrent unique index. The applied migration
files remain immutable.

Medusa's application runner also holds a transaction advisory lock around each
module. That idle transaction retains a snapshot that the concurrent partial
index must wait for, while the coordinator waits for the index. Testing only
`MedusaModule.migrateUp` misses this outer boundary.

For the opted-in module, the patch acquires the same
`db-module-migration:supportTicket` advisory key on a dedicated physical
connection without opening a transaction. It uses `pg_try_advisory_lock` and
100 ms JavaScript waits: a blocking SQL lock waiter could itself retain a
snapshot. The connection remains pinned until migration completion. Unlock,
pool release and pool destruction run on success and failure; simultaneous
migration and cleanup errors are preserved. Each invocation owns its private
pool, so an uncertain unlock cannot return a session to another migration.
All modules without the exact opt-in retain upstream transaction locking.

PostgreSQL documents the relevant [concurrent-index snapshot waits and invalid
index behavior](https://www.postgresql.org/docs/16/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY)
and [session versus transaction advisory locks](https://www.postgresql.org/docs/16/explicit-locking.html#ADVISORY-LOCKS).

## Validation and release constraints

`migration-coordinator-native.unit.spec.ts` exercises the complete pinned
`MedusaAppMigrateUp` coordinator in separate processes against explicitly
configured loopback PostgreSQL. It covers fresh/repeated migration, legacy
upgrade, soft-deleted proposal uniqueness, competing runners, failure/retry,
invalid-index failure and unchanged default transaction locking. It runs in
the existing CI PostgreSQL fixture using `CONSENT_TEST_POSTGRES_URL`; without
that explicit fixture it is skipped. Databases are synthetic and preserved.
The lock lifecycle unit suite tests acquisition, migration, unlock and cleanup
failures against the exact installed package patch.

Deploy this change through the normal reviewed release process. Do not overlap
old and patched migration runners: their advisory keys still conflict, but an
old runner can retain the snapshot that caused the original problem. Existing
unrelated long-lived transactions may still delay concurrent index creation.
Session locks require a direct or session-pooled PostgreSQL connection; a
transaction-pooling proxy cannot guarantee physical session affinity.

A successful migration does not make these additive migrations reversible.
Duplicates or an existing invalid consent index must remain a visible failure.
Do not automatically drop/recreate the index, alter migration history, terminate
sessions, or suppress the error. Diagnose and approve a separate recovery plan.
The uniqueness invariant includes soft-deleted tickets.

When changing the pinned Medusa SDK, reassess this patch against upstream and
rerun the full coordinator tests before removing it. A module-only migrator
check is insufficient. A lost database session can release advisory ownership;
this coordination mechanism does not claim distributed fencing across a broken
connection or repair an interrupted concurrent index build.
