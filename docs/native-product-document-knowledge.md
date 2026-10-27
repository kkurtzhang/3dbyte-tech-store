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

The Content API review path accepts any valid **full-access Strapi Content API token**. The separate Admin pilot path below records an authenticated Admin user. The event stores `actor_type=content_api_token` and that token's actual numeric database ID. It does not prove a named human reviewed the material, and the client cannot choose the actor in a request body. An authorized agent may perform the review using an approved service credential; its decision note must accurately describe the review it performed. A reviewer must inspect the exact source evidence, native product/variant binding and canonical revision before approving it.

No particular existing credential has been selected or verified for rollout, and no live credential was created or broadened for this work. The rollout owner must identify the intended existing token, its accountable owner and existing permissions through the approved access process. Do not assume the CMS integration token is automatically authorized for factual review or impersonate a human with its attribution.

Strapi 5.48.1 supports custom Content API token abilities for route action scopes. However, these native actions currently also require `credentials.type === "full-access"`; granting a custom token an action scope alone would still be rejected. A narrower reviewer role would require an explicit authorization change and tests for preview/review/intake separation, denied unrelated actions, expiry/revocation and real CMS HTTP authentication. This validation patch does not alter that policy or grant access. If full-access token scope is unacceptable for the rollout, keep the deployment blocked until a reviewed least-privilege change is ready.

`knowledge_review` JSON is not a genuine native event. Existing JSON-only approvals fail closed. Never migrate them by silently inventing an actor or approval timestamp. Re-review the exact current native revision and persist a real authenticated decision. Events are immutable through application lifecycle APIs; database-owner raw SQL is outside that guarantee. Each revision has one decision. Replaying the same decision returns the original event and actor; a conflicting decision requires a new revision or withdrawal from publication, not mutation of the event.

## Native Admin review pilot

The Content Manager **Review knowledge** action opens a fresh packet for the saved draft or published tab. It shows the canonical plain-text content, source URL/version/check time/hash, product association, binding scope, evidence excerpts and explicit unknowns. Unsaved form edits are excluded. A reviewer supplies an expiry and review note and acknowledges checking the exact packet. The UI uses Strapi's [document-action modal API](https://docs.strapi.io/cms/plugins-development/content-manager-apis); text is escaped by React and is never interpreted as HTML.

The application registers the `api::knowledge-review.review` Content Types permission (displayed as **Review knowledge**) for Product Document only, with field permissions. It defines no role grants. The normal Strapi Super Admin behavior still applies; registering an action is not a new restriction on a Super Admin. A rollout owner must separately approve any ordinary role assignment, deployment and live review.

Both `GET /knowledge-review/:documentId?status=draft|published` and `POST /knowledge-review/:documentId` are Admin routes restricted to the `admin` authentication strategy and `admin::isAuthenticatedAdmin`. Content API tokens, Admin API tokens and Users & Permissions sessions cannot authenticate these routes. The existing full-access Content API actions retain their separate authentication and attribution.

The server additionally requires all of these permissions against the actual saved record, using Strapi's Content Manager permission checker and its record conditions:

- `api::knowledge-review.review` on `knowledge_content`.
- Content Manager `update` on `knowledge_content`.
- Content Manager `read` on every field returned in the canonical packet: `medusa_product_id`, `product_title`, `product_handle`, `title`, `source_url`, `source_kind`, `source_checked_at`, `version` and `knowledge_content`.

The server checks the model/field capability before reading, then checks the concrete record and its creator/editor relation IDs. It refuses private content if any required permission is missing. Request-supplied model, actor, timestamp, publication controls and extra fields are rejected. Preview responses are private and uncached; decision responses contain only decision/revision/expiry/actor metadata, not private notes or account profiles.

The pilot is fixed in server code to these exact document/product pairs; a request cannot expand it:

| Document  | Native document ID         | Native Medusa product ID          |
| --------- | -------------------------- | --------------------------------- |
| Magigoo   | `mu3sv3poa965a25lvvlbdngc` | `prod_01KSY6A5870Y2J3VR66XAWP9GD` |
| Dragonfly | `uur1zr0pe99e6px1r5ljs0nm` | `prod_01KSY6A587QB771VW85M12GSWJ` |

An Admin decision records `actor_type=admin_user` and the ID of the framework-verified, active Admin user. This is account attribution, not proof that a human independently verified every fact; the note must accurately disclose agent assistance. The existing `content_api_token` actor remains valid. An idempotent retry returns the original actor and decision, even across these two paths. No review event or old canonical hash is migrated.

Submission binds to the packet's exact canonical revision and saved status. Inside the existing PostgreSQL review transaction, a row lock on both draft/published rows precedes rereading and authorization. An edit committed while a review waits makes the stale submission fail. An edit after approval changes the canonical hash, making the previous event ineligible for the new content. Conflicting decisions for a revision remain immutable. The UI discards the packet after an unconfirmed submission and requires reopening/reinspection.

A review creates only the immutable event. It does not save editor changes, publish, change `is_public`, enqueue indexing, or grant a role. Publication and current native Medusa binding checks still govern public eligibility. The source schema and canonical bytes remain unchanged; accepting `admin_user` is the explicit authorization expansion in the public approval verifier.

This action builds on the deployed PR #242 architecture. It does **not** require [PR #243](https://github.com/kkurtzhang/3dbyte-tech-store/pull/243) to record reviews. The separate, bounded two-document indexing step depends on that scoped-sync change (or another explicitly authorized scoped operation). Neither this action nor its deployment authorizes using the broad sync route, publishing pilot content, changing background flags or retrying a previously denied integration-token request.

Before rollout, require review of this authorization change, successful CI, approved deployment and intended role assignment, and an authenticated Admin browser check with an existing approved account. Isolated validation uses synthetic records and roles. It does not establish that a particular live account has permission or that either pilot's factual content is approved.

## Synchronization and retrieval guarantees

CMS offset pagination checks counts and duplicate IDs but does not provide an atomic snapshot. A count-preserving publication or sort change may still omit a live record. Before a full reconciliation makes any index mutation, every missing indexed identity is reread with an exact published/public CMS scope. If a missing record is actually present, or a point read fails/is malformed, the whole reconciliation aborts and preserves the old index. A stable retry can then update the snapshot. Missing-ID reads run four at a time and are capped at 2,000 identities; oversized or invalid identity snapshots fail closed. Scoped webhook reconciliation already reads the exact document and does not require the full index scan.

There is no transaction spanning CMS and Meilisearch. A republish after an authoritative absence check is repaired by a later webhook or periodic reconciliation. Retrieval still rechecks source publication/revision before using evidence. A CMS outage is never evidence of withdrawal.

Knowledge discovery filters `knowledge_revision_hash EXISTS` before applying the eight-candidate bound. Only approved indexed records receive that field; metadata-only downloads cannot consume the entire candidate window. The field is configured as filterable. Every candidate still undergoes fresh publication, expiry, revision, product and declared binding-scope checks; stale indexed eligibility never authorizes an answer. At most four current documents and paired citations are returned. More than eight stale knowledge candidates can still reduce recall until reconciliation repairs the index; metadata-only saturation is addressed without unbounded scans. The filter uses Meilisearch's documented [EXISTS expression](https://www.meilisearch.com/docs/capabilities/filtering_sorting_faceting/advanced/filter_expression_syntax).

A full-sentence question can miss lexical discovery even when an approved document contains the requested fact. After a successful zero-hit search, an exact product scope permits one additional placeholder search with the same approved-revision, product and optional variant filters and the same eight-candidate bound. A variant-only request must first resolve its current published product owner. Unscoped misses, search errors, malformed responses and nonempty results whose candidates fail validation do not trigger this fallback. No settings, source data or review is changed.

This fallback locates evidence for the known product; it does not assert that the evidence answers every question. Current source/revision/publication/expiry/binding checks and null unknowns still apply. At most two search requests and four returned documents are allowed. More than eight eligible documents can still limit recall. The backend does not rewrite questions or invoke a model; concise keyword queries remain useful for unscoped discovery.

Multiple product-scoped documents, documents per variant and variants per ordinary priced product are valid. Unknown facts remain null. Historical AUD evidence is not a current offer; current price and stock come from commerce tools. An orphan may remain download metadata, but cannot ground knowledge without a valid native product binding and, where declared, its exact variant.

## Storefront answer grounding

The normal storefront route records only `searchKnowledge` executions made by
this request against the authenticated backend. It validates each bounded
approved-document DTO, its paired citation and any requested product/variant
scope. Client history and model-written tool results do not authorize evidence.
The backend remains responsible for fresh CMS approval, canonical revision and
native product identity checks; the storefront does not replace those checks.

The model can ignore the prompt even when retrieval is correct. In the staging
`4f9b21065c14f766fd638ad30702112460396860` acceptance run, it correctly left the
Dragonfly BMS installed temperature unknown but added an unsupported statement
about typical temperature ranges and the limiting hardware. The exact four
observed prompts, responses and public tool outputs are preserved in
[`observed-knowledge-answers.json`](../apps/storefront-v3/src/app/api/ai-shopping-assistant/__fixtures__/observed-knowledge-answers.json).
The captured timestamp is fixed in regression tests so evidence expiry does not
make the test silently exercise a different case.

For technical questions and natural product follow-ups, the route requires a
current catalogue lookup followed by `searchKnowledge` within the existing
five-step bound. The catalogue request is skipped when the customer declines
it. Customer messages supply conversational context, never evidence; historical
assistant claims and tool parts cannot supply approved facts. A single direct
catalogue match from the current request can supply the product scope. Multiple
matches stay ambiguous and no variant is inferred. Known product scope retains
the backend's bounded lexical-miss fallback and every ownership/source check.

The visible answer uses current validated fact labels/values and explicit null
unknowns. Model assertions, including text before a tool call, remain withheld
on knowledge turns; an ignored required lookup cannot authorize technical
claims. The answer composer adds safe clarification and a concrete next step
without requiring corpus-backed specifications for those conversational actions.
Ordinary clarification questions can retain model wording without a lookup.

Retrieval distinguishes no matching eligible documents from matching candidates
whose current body/revision cannot be verified, and from transport failures.
These diagnostics never contain rejected facts or sources. `not_current` is an
aggregate diagnostic (expiry, withdrawn/invalid review, changed revision or
binding); it does not prove which underlying reason occurred. The customer sees
the specific unanswered requirement and one useful clarification or safe next
step, without internal approval terminology. This does not renew a review,
change source validity, or populate missing knowledge.

Recognized single-topic questions select relevant fields and safety qualifiers
instead of dumping unrelated specifications. Complete explicit field requests
retain exact label matching. Compound, broad or unrecognized questions keep all
bounded facts and unknowns (at most thirty); ambiguous field labels are retained.
Selection uses field names/labels, never instructions inside fact values. A
missing requested topic stays unanswered; a component rating cannot establish
an installed printer limit even if no explicit null field was returned. Sources
that conflict for the same product/scope/field remain associated with that
unresolved claim, including contradictory documents beyond the presentation cap.

Presentation consolidates the installed-limit unknown and its safety explanation
into one paragraph. An exact recognized trailing qualification on a component
temperature fact may move into that paragraph; other approved wording and
conditions are retained verbatim. Model-level scope stays in Sources rather than
an unconditional installation disclaimer. Exact variant facts retain a concise
variant label in the answer and their existing validation and source scope.

Citations are deduplicated native SDK `source-url` parts after the answer text.
Provider-generated sources are discarded. The drawer renders them once in its
final Sources section through HTTPS-only links, with product/scope/field
attribution. Functional product links remain available as current catalogue
actions. Text remains held until the SDK finish event so unsupported pre-tool
assertions cannot appear transiently.

This changes the response experience: tool/status events still stream, but text
is held until the SDK finish event, including on ordinary non-knowledge turns.
Those ordinary turns keep their text and existing email masking, with a 64,000
character limit. Aborted, errored or truncated streams do not release held text.
Traces record only the final visible text. Product action and support confirmation
cards keep their existing authorization paths. Mixed knowledge turns also render
bounded, schema-validated results captured from this request's authenticated
`lookupOrder`, `getTracking` and `estimateShipping` executions. Order/payment/
fulfillment statuses, items, totals, tracking identifiers and shipping estimates
have separate labels; one status does not imply another. Order amounts stay in
Medusa's major units; shipping charges use that endpoint's explicit cent contract.
Failed/invalid lookups remain explicit, and client-owned historical tool parts
cannot supply summaries. Each commerce execution is recorded once, with at most
five per turn. Raw tool contracts remain unchanged; only whitelisted fields
become grounded prose. No unrestricted model prose is restored.

The boundary is intentionally limited to attempted knowledge retrieval. It does
not force the model to retrieve, establish that every question was answered,
validate non-knowledge prose, or turn component/model facts into a verified
installed-printer safety limit. Multiple valid products stay separately scoped;
retrieval relevance still matters. No runtime flags, credentials or CMS evidence
are changed by this fix.

Deterministic route regressions use the actual pinned AI SDK with a mock provider
replaying the captured replies plus adversarial pre-tool claims. They verify
supported Magigoo/BMS facts, exact citations, unknown installed limits and
mismatched products. Additional tests cover invalid/expired citations, explicit
scope mismatches, mixed supported/unsupported safety claims, documented safety
numbers, stream interruption, bounded output and ordinary replies. Review
regressions also cover complete multi-intent answers with supported facts and named
unknowns, mixed orders/tracking/shipping, forged history, requested
ninth/thirtieth facts and a real SDK-to-drawer DOM test for safe clickable sources.
These are not live-model evaluations of the patched route. A live provider
acceptance run and review of the extractive answer experience remain release checks.

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

## Bounded pilot synchronization and review access

Use the strict one-or-two-document Admin `/scoped` sync route for a bounded pilot. See [scoped sync and review access](scoped-product-document-sync-and-review-access.md) for its unchanged authorization boundary, index-readiness prerequisite and proposed review-access options. The authorization proposals are not implemented or activated.
