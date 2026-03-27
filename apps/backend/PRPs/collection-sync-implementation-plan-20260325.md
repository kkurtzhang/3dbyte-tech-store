# Collection Sync Implementation Plan

## Goal

Automate Medusa product collection lifecycle sync into Strapi using `medusa_collection_id`
as the stable identity, replacing the current manual reconciliation-only flow.

## Scope

- Backend: Medusa subscribers, workflows, Strapi service support
- CMS script: keep as backfill/reconciliation, update to prefer `medusa_collection_id`
- Storefront: no required changes for core sync; collection search can be added later

## Assumptions

- The Strapi `collection` content type includes a unique `medusa_collection_id` field.
- Editorial fields such as image and enriched description remain CMS-owned.
- Medusa-owned fields are `id`, `title`, `handle`, and default description seed data.

## Phase 1: Backend Strapi Service

Add collection support to `apps/backend/src/modules/strapi/service.ts`:

- Add `SyncCollectionData` type
- Add `findCollectionDescription`
- Add `createCollectionDescription`
- Add `updateCollectionDescription`
- Add `deleteCollectionDescription`
- Optionally add `markCollectionDescriptionOutdated` if delete semantics change later

Implementation rules:

- Query Strapi by `medusa_collection_id`
- Only sync Medusa-owned fields
- Do not overwrite editorial image/content beyond the agreed seeded fields
- Create on update if the record does not already exist

## Phase 2: Medusa Workflows

Add Strapi workflows under `apps/backend/src/workflows/strapi/`:

- `sync-collection-to-strapi.ts`
- `update-collection-to-strapi.ts`

Optional later:

- `delete-collection-from-strapi.ts`

Patterns:

- Follow the existing product workflows
- Use `useQueryGraphStep` to fetch the collection by ID
- Query fields: `id`, `title`, `handle`

## Phase 3: Medusa Subscribers

Add collection subscribers under `apps/backend/src/subscribers/collections/`:

- `collection-created.ts`
- `collection-updated.ts`
- `collection-deleted.ts`

Use Medusa product collection events:

- `product-collection.created`
- `product-collection.updated`
- `product-collection.deleted`

Behavior:

- created -> create/sync in Strapi
- updated -> update in Strapi
- deleted -> delete from Strapi

## Phase 4: Reconciliation Script

Update `apps/cms/scripts/sync-collections-from-medusa.mjs`:

- Prefer matching by `medusa_collection_id`
- Fallback to handle matching for legacy rows during migration
- Backfill `medusa_collection_id` onto existing Strapi rows when matched
- Keep the script for manual reconciliation and recovery
- Report orphaned Strapi rows that no longer exist in Medusa

## Phase 5: Testing

Follow TDD and add backend unit tests:

- Strapi service collection create
- Strapi service collection update
- Strapi service collection delete
- Update path creates if missing
- Matching is keyed by `medusa_collection_id`, not handle
- Handle rename updates existing row instead of creating duplicate
- Delete subscriber calls Strapi delete for the right Medusa collection ID

If practical in this pass:

- Workflow tests for create/update input handling

## Rollout

1. Add tests
2. Implement Strapi service methods
3. Implement workflows
4. Implement subscribers
5. Update reconciliation script
6. Run backend unit tests

## Deferred

- Search dialog support for collections
- Dedicated Meilisearch collection index
- Strapi unpublish/outdated behavior instead of hard delete
