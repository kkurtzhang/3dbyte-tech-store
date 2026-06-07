# Customer Auth Consolidation Rollout

## Goal

Keep registered customers as canonical accounts while retaining guest customer
records as historical checkout identities. Verified exact-email ownership can
connect eligible orders, carts, support tickets, and blank profile fields
without automatically merging registered customers.

## Runtime Controls

```env
CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=off
CUSTOMER_GOOGLE_AUTO_LINK_ENABLED=false
CUSTOMER_ACCOUNT_COORDINATION_SECRET=<random secret>
```

- `off`: no guest-history discovery or mutation. Use for the first migration
  deploy.
- `dry_run`: records an eligible consolidation summary without changing
  customer-owned data.
- `live`: executes the reviewed, idempotent consolidation workflow.
- Explicit Account Settings linking uses a customer-bound, single-use intent
  even while Google auto-linking is disabled.
- Consolidation idempotency is based on relevant customer, order, cart, ticket,
  dispute, transfer, and ownership state. Identical retries reuse one run,
  while later guest activity creates a new eligible snapshot.
- Sensitive account mutations are rate-limited per customer and operation in
  each backend process. Move these buckets to shared Redis before running
  multiple backend replicas so the limit remains global.

Use a dedicated coordination secret in each environment. Do not reuse the
staging value in production.

## Staging Sequence

1. Deploy migrations with consolidation `off` and Google auto-link disabled.
2. Open Medusa Admin **Identity Issues** and inspect duplicate registered
   customers, orphan identities, failed runs, stale link intents, and accounts
   with no usable login.
3. Set consolidation to `dry_run`, redeploy the backend, and exercise guest
   checkout followed by email/password registration, Google login, and explicit
   Google linking.
4. Review each customer **Account & Login Security** widget and dry-run summary.
5. Set consolidation to `live`, redeploy the backend, and repeat the matrix.
6. Enable Google auto-linking only after exact-email and conflict behavior is
   confirmed on staging.

## Acceptance Matrix

- Guest records remain separate until verified ownership.
- Eligible orders use Medusa order-transfer workflows.
- Cancelled, disputed, already-owned, pending-transfer, and other-customer
  orders remain untouched.
- Repeated consolidation attempts are idempotent.
- Google links only when its verified email exactly matches the canonical email.
- Replayed, expired, mismatched, or cross-customer link intents fail.
- Google-only customers reauthenticate with Google before adding a password.
- Google cannot be disconnected when it is the final usable login method.
- Email changes require the current password, reject Customer/Auth collisions,
  and require Google to be disconnected first.
- Email changes never claim historical orders under the new email.
- Admin and storefront responses never expose provider subject IDs, OAuth
  tokens, link nonces, transfer tokens, or raw provider metadata.

## Production Gate

Repeat the inventory with production flags still `off`. Move production through
`dry_run` and `live` only after a human reviews the Admin issue queue and the
staging browser matrix is green. Registered-to-registered conflicts always
remain manual review items.
