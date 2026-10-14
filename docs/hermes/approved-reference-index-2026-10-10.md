# Scoped approved reference index

The staging `/references` search uses a dedicated derived Meilisearch index.
Every returned fact and citation is read again from the current Strapi approved
document and checked against the current unpriced Medusa draft binding. A stale
index entry cannot authorize an old revision, expired review or missing source.
The existing empty-query browse path continues to read current native records.

`src/jobs/sync-knowledge-references.ts` reconciles every five minutes only when
`APP_ENV=staging`, `KNOWLEDGE_REFERENCE_INDEX_ENABLED=true` and
`KNOWLEDGE_REFERENCE_PRODUCT_IDS` lists 1–100 unique, explicitly selected native
product IDs. It never scans unrelated drafts. Leave activation off until genuine
approval and native binding are recorded and release checks are complete.

The optional module setting `knowledgeReferenceIndexName` defaults to
`knowledge_references_staging`. One configured scope owns this dedicated index;
shrinking that scope removes its former entries. Do not share the index name
with product, public-document or another independently reconciled index.
`product_documents_public` continues to have its separate public-document
contract; publication there is not knowledge approval.

The job requires a complete scoped graph result before mutating search, indexes
only verified editorial fields, waits for native Meilisearch tasks through the
existing service, and deletes entries that lose eligibility. Source approval,
commerce records and the local archival vault are never changed. Transient CMS
failures can temporarily remove candidates; the next successful reconciliation
restores eligible ones. Search reads fail closed while sources are unavailable.
Publication, expiry and unpublish converge within one poll after successful
service recovery. Read-time checks reject stale results immediately.

The index supports bounded lexical discovery (`q`, max 120 characters,
four candidates per request, offsets through 5000). It does not perform model
generation, vector retrieval or physical-stock inference. Unknown facts remain
null. Simulation markers stay outside the index and are shown only as explicitly
simulated quantities on the verified reference card; price remains null and
checkout disabled. Native source hashes and dates are editorial assertions checked
by the existing approval contract, not a fresh external URL or archived-blob audit.

Local evidence uses disposable Strapi/PostgreSQL and Meilisearch, the actual
registered-service implementations/job entry, actual Store route and storefront
SDK/React cards. The Medusa graph and clock dispatcher are controlled synthetic
fixtures; a full Medusa scheduler/graph and full Next application boot were not
part of that evidence. Verify job registration, native graph scopes, selected
index configuration and the complete staging browser flow at release. Synthetic
approvals do not approve any of the 19 real prepared documents.
