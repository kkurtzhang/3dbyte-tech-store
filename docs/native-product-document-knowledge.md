# Native Product Document knowledge: activation and validation

This implementation projects approved Strapi Product Documents into the existing public-document Meilisearch index. Medusa remains the authority for the native product and, for variant-scoped facts, its exact variant identity. Search returns candidates; retrieval rereads the current CMS revision and Medusa identity before returning evidence and citations. Index text alone cannot ground an answer.

## Capability and activation boundaries

The background flags are not a global feature or security switch. Deploying these routes and controllers exposes the following capabilities even while both background flags are false.

| Capability                                                                      | Actual boundary                                                                                                       | Controlled by a background flag? |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| CMS atomic intake: `PUT /api/product-documents/import-upsert`                   | Strapi Content API token authentication and an additional full-access token check; transaction-scoped PostgreSQL lock | No                               |
| CMS private review preview: `GET /api/product-documents/:documentId/review`     | Authenticated full-access Content API token; returns private canonical content for review                             | No                               |
| CMS immutable review decision: `POST /api/product-documents/:documentId/review` | Authenticated full-access Content API token; exact revision precondition, server actor/time and protected event write | No                               |
| CMS private import lookup                                                       | Authenticated full-access Content API token                                                                           | No                               |
| CMS metadata list and `?knowledge=approved` projection                          | Anonymous published/public records; approved text additionally requires a valid separately persisted review event     | No                               |
| CMS `/:documentId/knowledge-reference`                                          | Anonymous; exact native identity/revision, publication and approval eligibility checked                               | No                               |
| Medusa manual `POST /admin/meilisearch/sync-product-documents`                  | Existing Medusa Admin authentication; direct reconciliation                                                           | No                               |
| Medusa `POST /ai/knowledge-search`                                              | Existing internal API token and `/ai` rate-limit boundary                                                             | No                               |
| Normal storefront assistant `searchKnowledge`                                   | Existing assistant configuration/rate limit; server calls the internal endpoint                                       | No                               |
| Public-document webhook handling and five-minute repair job                     | Existing webhook authentication plus `PRODUCT_DOCUMENT_SYNC_ENABLED=true`; job uses the same opt-in                   | Yes                              |
| Legacy reference five-minute job                                                | `APP_ENV=staging`, `KNOWLEDGE_REFERENCE_INDEX_ENABLED=true`, explicit product IDs and isolated staging index name     | Yes                              |

Therefore rollout approval must cover the CMS review/private-read routes, public approved projection, manual indexing and assistant retrieval independently of enabling scheduled/background work. This local implementation does not itself authorize deployment, a real review decision, native import/publication, enabling flags or expanding credentials.

## Reviewer identity and least privilege

The current accepted actor is any valid **full-access Strapi Content API token**. The event stores `actor_type=content_api_token` and that token's actual numeric database ID. It does not prove a named human reviewed the material, and the client cannot choose the actor in a request body. An authorized agent may perform the review using an approved service credential; its decision note must accurately describe the review it performed. A reviewer must inspect the exact source evidence, native product/variant binding and canonical revision before approving it.

No particular existing credential has been selected or verified for rollout, and no credential was created or broadened for this work. The rollout owner must identify the intended existing token, its accountable owner and existing permissions through the approved access process. Do not assume the CMS integration token is automatically authorized for factual review or impersonate a human with its attribution.

Strapi 5.48.1 supports custom Content API token abilities for route action scopes. However, these native actions currently also require `credentials.type === "full-access"`; granting a custom token an action scope alone would still be rejected. A narrower reviewer role would require an explicit authorization change and tests for preview/review/intake separation, denied unrelated actions, expiry/revocation and real CMS HTTP authentication. This validation patch does not alter that policy or grant access. If full-access token scope is unacceptable for the rollout, keep the deployment blocked until a reviewed least-privilege change is ready.

`knowledge_review` JSON is not a genuine native event. Existing JSON-only approvals fail closed. Never migrate them by silently inventing an actor or approval timestamp. Re-review the exact current native revision and persist a real authenticated decision. Events are immutable through application lifecycle APIs; database-owner raw SQL is outside that guarantee. Each revision has one decision. Replaying the same decision returns the original event and actor; a conflicting decision requires a new revision or withdrawal from publication, not mutation of the event.

## Synchronization and retrieval guarantees

CMS offset pagination checks counts and duplicate IDs but does not provide an atomic snapshot. A count-preserving publication or sort change may still omit a live record. Before a full reconciliation makes any index mutation, every missing indexed identity is reread with an exact published/public CMS scope. If a missing record is actually present, or a point read fails/is malformed, the whole reconciliation aborts and preserves the old index. A stable retry can then update the snapshot. Missing-ID reads run four at a time and are capped at 2,000 identities; oversized or invalid identity snapshots fail closed. Scoped webhook reconciliation already reads the exact document and does not require the full index scan.

There is no transaction spanning CMS and Meilisearch. A republish after an authoritative absence check is repaired by a later webhook or periodic reconciliation. Retrieval still rechecks source publication/revision before using evidence. A CMS outage is never evidence of withdrawal.

Knowledge discovery filters `knowledge_revision_hash EXISTS` before applying the eight-candidate bound. Only approved indexed records receive that field; metadata-only downloads cannot consume the entire candidate window. The field is configured as filterable. Every candidate still undergoes fresh publication, expiry, revision, product and declared binding-scope checks; stale indexed eligibility never authorizes an answer. At most four current documents and paired citations are returned. More than eight stale knowledge candidates can still reduce recall until reconciliation repairs the index; metadata-only saturation is addressed without unbounded scans. The filter uses Meilisearch's documented [EXISTS expression](https://www.meilisearch.com/docs/capabilities/filtering_sorting_faceting/advanced/filter_expression_syntax).

Multiple product-scoped documents, documents per variant and variants per ordinary priced product are valid. Unknown facts remain null. Historical AUD evidence is not a current offer; current price and stock come from commerce tools. An orphan may remain download metadata, but cannot ground knowledge without a valid native product binding and, where declared, its exact variant.

## Validation and evidence locations

The reusable planner and fixture tests stay in source. Its generated corpus inventory is an external evidence artifact, not a runtime input. [The receipt](../scripts/local-knowledge/evaluation/public-document-native-plan-20261014.receipt.json) records its exact hash, source hashes, historical Git identity and SSD destination. No source content was renamed to avoid a scanner, no scanner exception was added, and historical findings remain in the original local commits.

Matched type-check evidence compares staging `980e980cadaa14c34a55e4dc81d28b7fde2c6859` and review head `977f7ac5d39be5f6f4427ad948b76017089077a2` with the same lockfile, dependency realpaths, Node version and generated Medusa declarations. Both reproduce 15 errors when `.medusa/types` is absent; both pass backend and Admin checks after the installed Medusa build generator runs. The module bindings are byte-identical; query declaration ordering differs but the canonical TypeScript AST is equivalent. These were missing-generation errors, not demonstrated source defects.

Current offline tests cover the count-preserving pagination race, timeout/outage protection, metadata saturation, exact variants, immutable token actor/replay and assistant citation/unknown passthrough. They do not establish real PostgreSQL transaction behavior, actual CMS HTTP authorization/lifecycle persistence, Meilisearch credentials or model-written answers.

External evidence and the unexecuted real-service acceptance plan are under:

`/Volumes/MINI-M1/Codex/3dbyte-tech-store/artifacts/native-knowledge-pipeline-20261014/validation/`

`ACCEPTANCE-PLAN.md` lists deterministic lock barriers, clock boundaries, persistence assertions, fixture-only writes, resource/access prerequisites and remaining integration limits. `acceptance.compose.yml` has been rendered offline only: loopback ports, internal network, external SSD bind mounts and no image pulls. No service or preview was started.

## Product and variant binding scope

New `knowledge_content` should declare one binding for the entire document:

```json
{ "version": 1, "binding_scope": "product", "variant_id": null }
```

Product scope supports model-level official guidance and must match the current native product ID, title and handle. It does not require a purchase, batch, receipt, physical stock or a fabricated variant. A product with no variants can have model-level knowledge. Model guidance must not imply a particular colour, kit contents, physical revision or exact fit; unsupported facts remain explicit nulls. Source-document version metadata describes the evidence source, not proof of a physical product revision.

```json
{ "version": 1, "binding_scope": "variant", "variant_id": "variant_exact" }
```

Variant scope requires that exact current variant to belong to the native product. Product scope requires an explicit null variant; variant scope requires a nonempty valid variant ID. Other combinations and unknown scopes are rejected. Publication, source freshness, exact canonical revision, immutable authenticated review and all native identity checks still apply. Scope is part of the canonical hash, review event and derived search projection. Changing scope or a variant requires a new revision review; an old event cannot authorize the changed binding.

For compatibility, a legacy document with no `binding_scope` and an explicit variant ID retains its original canonical bytes and is interpreted only as variant scope. Its existing immutable review event may have no scope value. Missing scope never authorizes a null variant. An explicit scope requires the same scope in the review event; new reviews always persist it. Adding explicit variant scope to a legacy body changes its hash and requires a fresh review. No existing events are rewritten.

Search indexes `knowledge_binding_scope` and the approved revision marker. The marker, rather than the presence of a variant ID, excludes metadata-only records before the eight-candidate bound. An exact-variant query may return model-level product facts alongside facts for that exact variant, but only after confirming that the requested variant belongs to the current product. Other variants and other products cannot supply evidence. Citations always expose `binding_scope`, with null variant IDs only for product scope. Legacy search candidates with an exact variant remain supported.

Before enabling this version, apply the additive private review-event scope field and nullable variant field through the reviewed CMS schema rollout. Keep existing event scope values absent; do not backfill or mutate immutable events. Reconciliation configures `knowledge_revision_hash` and `knowledge_binding_scope` as filterable before rebuilding the derived index; complete that configuration/rebuild before relying on the new discovery query. An old index missing these filterable attributes fails closed until configured. The existing staging-only legacy reference-shell path remains variant-only and is not broadened by this change.
