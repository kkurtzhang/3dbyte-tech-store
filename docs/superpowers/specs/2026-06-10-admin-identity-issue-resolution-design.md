# Admin Identity Issue Resolution Design

## Goal

Turn Medusa Admin's Identity Issues page from a read-only queue into a safe
operational repair surface while improving the customer and summary context.

## Issue Detail

Each row returns sanitized operational context:

- Provider and asserted email when the provider safely supplies one.
- Matching customer name, email, account type, and customer-detail link.
- Related customer records for duplicate-account cases.
- A specific explanation of why the issue exists.
- The recommended action, affected-record counts, and any blocker.

Provider subject IDs, auth identity IDs, OAuth tokens, hashes, and raw provider
metadata remain server-only. Public issue IDs are deterministic hashes.

## Resolution Actions

- Orphan auth identity: delete its provider identities and then the empty auth
  identity after a fresh ownership check.
- Duplicate registered customers: select the canonical customer by usable
  login-method count, then account activity, then oldest creation date. Transfer
  eligible orders with Medusa order-transfer workflows, attach eligible carts
  and support tickets, reassign auth identities, fill only blank canonical
  profile fields, and retain source customers as non-account historical rows.
- Failed or partial consolidation: retry the existing idempotent guest-history
  consolidation workflow for the canonical customer.
- Stale or repeatedly failed Google link intent: close the intent.
- Stored identity conflict: remain read-only until a dedicated repair action
  handles the underlying ownership problem. Duplicate registered-customer
  conflicts are closed only by the duplicate merge repair.
- No usable login: remain informational because the system cannot invent a
  credential or prove customer ownership.

All actions require an authenticated Medusa admin, use schema-validated input,
re-scan current state before mutation, and append sanitized account-security
events with the acting admin ID and result counts.

## Admin UX

Rows show a two-line customer identity, account badges, precise summary, and a
resolution preview. Eligible rows have a Resolve button with a confirmation
prompt describing the canonical customer and planned mutation. Success
invalidates the issue and customer-security queries. Errors remain visible and
do not optimistically remove the row.

## Verification

- Unit tests cover safe issue serialization, canonical selection, orphan
  cleanup, duplicate merge, consolidation retry, intent closure, stale/replayed
  issue IDs, authorization wiring, and audit redaction.
- Admin helper/component tests cover customer labels, action eligibility, and
  mutation payloads.
- Backend build and focused browser verification cover the deployed Admin page.
