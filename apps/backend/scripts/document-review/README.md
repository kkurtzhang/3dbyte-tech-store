# Native public documents to durable local review

The manual Medusa operator job `src/scripts/sync-public-document-review.ts` resolves the registered Strapi service and calls its existing **complete published/public document reader**. It translates the normalized DTO into the existing preparer contract, then atomically synchronizes an explicitly scoped local SQLite review store. Failed/incomplete CMS reads abort before local changes. A document missing from a successful complete scope is withdrawn; other scopes are preserved. Source/metadata/provenance revisions replace chunks while retaining capture and chunk history. Identical successful snapshots can replay idempotently.

This is an operational repository adapter, with no new HTTP route, publication path or background task. It performs public CMS GETs and writes **local review state only**. No CMS/Medusa record, approval or Meilisearch index is written. Every chunk remains `retrieval_eligible:false` and `native_approval_verified:false`. The local revision hash must never replace the native CMS canonical-body approval/binding hash. Normal publication alone does not grant reference eligibility; the existing approved DTO and exact Medusa binding checks remain separate.

Run from a full backend checkout with existing dependencies and Python 3 available on the operator host:

```sh
APP_ENV=staging \
DOCUMENT_REVIEW_CAPTURE_MANIFEST=/path/to/review-captures.json \
DOCUMENT_REVIEW_CAPTURE_ROOT=/path/to/capture-files \
DOCUMENT_REVIEW_DATABASE=/path/to/local-review.sqlite3 \
DOCUMENT_REVIEW_PRODUCT_ID=actual_product_id \
pnpm exec medusa exec ./src/scripts/sync-public-document-review.ts
```

The existing Strapi service configuration is used; the reader sends no authentication header. No new credential is needed for this public path. `APP_ENV` must be `staging` or `test`; the optional product filter must be an exact native ID. The scope contains 1–100 unique actual document IDs. Supply it explicitly, including known IDs to reconcile on unpublish; the job does not silently expand the scope. Captures must already be present, hash verified and bound to the exact public asset/source URL. No source download occurs inside the job.

`review-captures.json` has `version:1`, `scope_document_ids` and an `artifacts` array. Each artifact has `document_id`, a safe basename `.txt`/`.pdf` `path`, lowercase SHA-256 `sha256`, exact HTTPS `origin_url`, `mime` (`text/plain` or `application/pdf`) and optional `source_provenance`. Provenance distinguishes original response bytes, derived source text, curated ledger material and unclassified captures; response hashes alone are not archived response proof. See the coordinator's `archive_source`, `quote_citation`, `review_snapshot` and `events` APIs for inspection and recovery. Quotations use normalized extracted-page character offsets.

Python/preparer files are incorporated from the preceding reviewed local milestone; the copied preparer has formatting-only changes. PDF extraction additionally requires existing Poppler tools. The helper resolves the repository-side bundle from source and compiled `.medusa/server/src` layouts. A full operator checkout or an explicitly retained sibling `scripts/document-review` bundle is required. This does not install Python in the application's Node container or register a customer index consumer. Missing runtime/captures fail closed; genuine native approvals, automatic reconciliation/consumer delivery and serving integration remain required before customer use.

```sh
python3 -B -m unittest discover -s scripts/document-review/tests -p 'test_*.py'
python3 -B -m unittest discover -s scripts/document-review/durable-sync-tools -p 'test_*.py'
TEST_TYPE=unit NODE_OPTIONS=--experimental-vm-modules \
  pnpm exec jest --runInBand --runTestsByPath \
  src/lib/knowledge-reference/__tests__/document-review-sync.unit.spec.ts
```

Validation includes 11 adapter cases with real Python/SQLite processes, 16 preparer and 24 persistence cases, and the existing native contract/reader/route suites. A separate disposable PostgreSQL/Strapi HTTP fixture verifies publication, revision, unpublish, process/CMS restart and approval/binding invalidation through the actual native adapters. Its product identities, bodies and approvals are synthetic, never real content approval. No live CMS/index writes or release action is authorized by these fixtures.
