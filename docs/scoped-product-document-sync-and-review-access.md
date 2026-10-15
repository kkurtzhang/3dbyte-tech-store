# Scoped document sync and review access

## Implemented: bounded Admin synchronization

`POST /admin/meilisearch/sync-product-documents/scoped` requires a strict JSON body:

```json
{ "document_ids": ["document_a", "document_b"] }
```

One or two distinct native document IDs are required. Missing/empty scope, duplicate IDs, unknown keys and malformed IDs return 400 before service access. This route inherits the existing `/admin/meilisearch*` user authentication and POST rate limit. It adds no credential, CMS permission, role grant or authentication strategy.

Each ID is read independently from the current published public CMS projection, including approved knowledge. A response containing a different ID, duplicate rows or a failed source read aborts before any index write. Native product bindings and approved revisions use the existing validation. All requested source reads and index readiness checks finish before mutation.

Only requested IDs may be upserted or removed. A requested ID absent from its exact public CMS read is removed from the derived index. An unrelated ID, including an orphan absent from CMS, is never enumerated, updated or deleted. Scoped sync does not configure index settings. It reads existing settings and requires the expected searchable/filterable fields and exact public displayed-field whitelist; a missing/unready index returns 503 without initializing or changing it. Any needed index configuration remains a separate reviewed rollout action.

Successful responses contain `document_ids`, `indexed`, `deleted` and `knowledge_indexed`. Failures return a generic 503. Meilisearch writes await terminal task completion. Upserts and deletions are separate tasks, so an error after the first mutation can leave **only the requested IDs** partially updated; retrying the same IDs is idempotent. There is no cross-service transaction or rollback claim.

The existing unscoped Admin route remains a full reconciliation. The legacy single-ID webhook behavior remains unchanged. A two-document pilot must use the new `/scoped` route explicitly and must not enable background flags as a substitute.

## Native Admin two-document pilot action

Settings → Meilisearch includes **Two-document pilot**, using the existing Admin SDK authentication and the scoped route above. Its fixed scope is `mu3sv3poa965a25lvvlbdngc` (Magigoo Original) and `uur1zr0pe99e6px1r5ljs0nm` (Dragonfly BMS). It has no arbitrary scope input, settings activation or full-sync fallback. The confirmation lists both IDs; cancellation submits nothing.

Check separately approved staging settings, current published revisions and review freshness before confirming. The server reads current eligible published content; the request does not pin revision hashes. Exact response IDs plus `indexed=2`, `deleted=0`, `knowledge_indexed=2` confirm server counts only. Verify both indexed hashes, task completion and unrelated state before using retrieval results. Pending, completed and unconfirmed attempts disable repeat submission until an operator checks state and reloads. Errors never trigger an automatic retry, disclose server details or imply rollback.

No new token, permission or authentication strategy is needed for this control. An actual expired Admin session uses the ordinary login flow; do not obtain browser cookies or tokens. Index setup is a separately approved operator action: preserve all unrelated settings, account for index-wide internal reindexing when searchable/filterable arrays change, and wait for terminal tasks before the scoped request. Background sync flags are not a substitute.

Regression checks: `TEST_TYPE=unit pnpm --filter @3dbyte-tech-store/backend exec jest --runInBand --runTestsByPath src/admin/lib/__tests__/pilot-document-sync.unit.spec.ts` and `pnpm exec playwright test --config apps/backend/integration-tests/admin/pilot-sync.playwright.config.cjs`. Browser tests use a synthetic SDK fixture and block external requests.

The following access sections record the original PR243 proposal and its denied Content API review boundary. The subsequently implemented [native Admin review pilot](native-product-document-knowledge.md#native-admin-review-pilot) is the current editorial path; it does not turn the old denied Content API route into an authorized one.

## Observed review-access boundary

The two-product pilot recorded HTTP 403 from the native review-preview route using the existing staging Medusa Strapi client. It made zero native changes. The ordinary Strapi Admin session is a different authentication domain. No denied request was retried or routed through another credential during this engineering work.

Current `00-native-actions.ts` limits these routes to the verified `content-api-token` strategy with action-specific scopes. `authenticatedActor` additionally requires `full-access`, and `approvedKnowledgeDocument` accepts only `content_api_token` events. Thus granting an Admin role or issuing a custom token alone cannot make the current action work. Removing the full-access check alone would be an incomplete authorization change.

Strapi distinguishes Admin routes from Content API routes, supports endpoint-specific custom token permissions, and provides role-based Admin permissions and conditions. See [API tokens](https://docs.strapi.io/cms/features/api-tokens), [Admin RBAC](https://docs.strapi.io/cms/features/rbac), and [plugin server routes](https://docs.strapi.io/cms/plugins-development/server-routes). The installed Strapi 5.48.1 `content-api-token` strategy verifies custom-token abilities against route scopes; Content Manager Admin routes require authenticated Admin state plus model/action permission policies. Those installed implementations are the version-specific starting point, not a raw bearer-header check.

## Proposal only: choose the review principal before implementation

No CMS authorization code, role grants, tokens, actor validation or review-event schemas are changed by this PR. The following options require explicit review and deployment approval.

| Option                     | Minimal permitted action                                                                                                                                                                                                                                                                   | Attribution and tradeoff                                                                                                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native Admin review action | A separate Admin route with existing verified Admin authentication, the Product Document read/field/record conditions, and an explicit review permission. Publishing stays independently governed by its existing permission.                                                              | Record server-resolved `admin_user` ID and timestamp. This identifies the authenticated account, not proof that its human owner personally checked the facts. Fits an editor workflow without creating a service credential, but needs an Admin action/UI and review-specific role policy.               |
| Scoped service reviewer    | Retain the Content API strategy and exact preview/review action scopes, validate the verified custom-token ability in the domain boundary, and enforce a server-side document/product allowlist for the pilot. No import, content update, publish, token-management or general CMS grants. | Record the verified token database ID as `content_api_token`, with explicit agent-review notes. Fits delegated automation and keeps the machine principal honest; provisioning or changing its credential/permissions needs approval. A short-lived credential limits duration, but is not created here. |

Prefer the Admin action for editorial review in the existing Admin workflow. For unattended agent execution, prefer an explicitly approved scoped service principal over elevating the existing Medusa integration token to full access. Neither option is a silent workaround for the observed 403.

For an Admin implementation, do not accept an arbitrary `ctx.state.user`, disable authentication, synthesize a full-access token state, or expose content-API review routes to Admin cookies. Enforce record/field conditions through Strapi's existing permission-checker semantics, and derive the principal only from the verified Admin strategy. Introduce a separate trusted internal principal type shared by the review transaction, then deliberately extend approved-event validation to the new actor type while preserving old events and canonical revisions. UI hiding is not authorization.

For a service implementation, require the exact action ability and allowlisted document/product on both preview and submission. The configured allowlist is independent of caller-supplied IDs. Keep token expiry/revocation and strategy verification in Strapi, and preserve the application-level authorization check for non-route callers. Do not grant approval simply because a token is authenticated.

Both paths must keep the existing transactional revision check, immutable events and server clock. Caller-provided actor IDs/timestamps are rejected. Action provenance must distinguish an authenticated account/token from human factual approval: a delegated agent action must remain disclosed as agent-assisted; if execution provenance cannot be verified, record only the authenticated principal and do not assert a human review.

Acceptance before authorization rollout must cover anonymous/wrong-domain/expired/revoked principals, read-only and custom-token permissions, Admin model/field/record conditions, missing review grants, forged actor state, pilot-allowlist escape, exact revision races, immutable prior events and public-projection privacy. Test both allowed and denied paths in an isolated fixture before any live access change.

## Pilot remains blocked on authorization approval

The scoped-sync fix does not approve either document or unlock the denied review route. After the user chooses and approves a review principal/model, recheck exact existing identities and current revisions before changes. Review, publication, index readiness and the two-document sync remain explicit steps. No native pilot write, new access, deployment or bulk operation is authorized by this document.
