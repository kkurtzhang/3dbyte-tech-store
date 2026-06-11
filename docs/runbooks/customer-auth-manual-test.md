# Customer Authentication Manual Test Runbook

## Purpose

Validate guest-history consolidation, email/password authentication, Google
OAuth linking, recovery, and Medusa Admin identity repair on staging.

Use unique test emails for every run. Gmail aliases work for email/password
tests, but Google OAuth always returns the Google account's canonical email.
Never delete only a Medusa customer after a Google test; use Identity Issues to
remove the orphan login identity first.

## Fixed Staging Configuration

Keep these values configured throughout the test:

```env
GOOGLE_CLIENT_ID=<staging OAuth client>
GOOGLE_CLIENT_SECRET=<staging OAuth secret>
GOOGLE_CALLBACK_URL=https://store.staging.3dbytetech.com.au/auth/google/callback
CUSTOMER_ACCOUNT_COORDINATION_SECRET=<dedicated staging random secret>
STORE_CORS=https://store.staging.3dbytetech.com.au
AUTH_CORS=https://store.staging.3dbytetech.com.au,https://api.staging.3dbytetech.com.au
STOREFRONT_URL=https://store.staging.3dbytetech.com.au
MEDUSA_BACKEND_URL=https://api.staging.3dbytetech.com.au
ORDER_EMAILS_ENABLED=true
```

Confirm the same callback URL exists in the Google Cloud OAuth client.

## Phase A: Inventory With Mutations Disabled

```env
CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=off
CUSTOMER_GOOGLE_AUTO_LINK_ENABLED=false
```

Redeploy Medusa server and worker.

1. Open Medusa Admin **Identity Issues**.
2. Confirm rows show a useful customer name/email/account type, provider,
   precise summary, and resolution description.
3. Confirm duplicate-customer and failed-consolidation rows say live mode is
   required and do not show an enabled Resolve button.
4. For a known orphan identity, select **Resolve** and confirm the dialog says
   customer/order records are retained.
5. Resolve it, refresh the page, and confirm the orphan row disappears.
6. Retry Google login with that Google account. Confirm a fresh identity can be
   created and login no longer fails because of the removed stale identity.

Expected: history is not consolidated. Stale identity and OAuth-intent cleanup
remain available.

## Phase B: Dry-Run Guest Consolidation

```env
CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=dry_run
CUSTOMER_GOOGLE_AUTO_LINK_ENABLED=false
```

Redeploy Medusa server and worker.

### Guest to Email/Password

1. Use a new alias such as
   `bucco.max.org+auth-dry-email-YYYYMMDD-01@gmail.com`.
2. Complete guest checkout with that exact email.
3. In Admin, confirm the customer is Guest and note the order.
4. Register with the exact same email and a new password.
5. Open the verification email and verify the account.
6. Sign in and open Account, Orders, and Settings.
7. Open the customer in Admin and inspect **Account & Login Security**.

Expected:

- Registration, verification, and sign-in succeed.
- A completed `dry_run` consolidation summary lists eligible history.
- The order is not transferred and therefore is not yet in account order
  history.
- Repeating the link operation reuses the same idempotent result.

### Guest to First-Time Google Account

1. Use a Google account whose canonical email is not currently linked.
2. Complete guest checkout with that canonical email.
3. Sign out, select **Continue with Google**, and choose that account.
4. Inspect the customer and security widget in Admin.

Expected:

- Google creates or claims one registered customer.
- The guest record remains separate.
- Dry-run history is reported but not transferred.
- No duplicate registered customer is created.

## Phase C: Live Guest Consolidation

```env
CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=live
CUSTOMER_GOOGLE_AUTO_LINK_ENABLED=false
```

Redeploy Medusa server and worker.

Repeat both Phase B scenarios with fresh emails.

Expected:

- Eligible guest orders appear in the registered account.
- Eligible active cart and unowned support tickets attach to the account.
- Only blank canonical name/phone fields are filled.
- Guest records remain as historical rows with consolidation metadata.
- Cancelled, disputed, pending-transfer, or other-customer orders are skipped.
- One themed consolidation email is sent.
- Repeating the operation does not duplicate transfers or notifications.

### Retry Failed Consolidation

1. Open an existing **Consolidation Failed** or **Consolidation Partial** row.
2. Confirm the row names the canonical customer and explains the retry.
3. Select **Resolve**, confirm, and wait for completion.
4. Refresh Identity Issues and the customer security widget.
5. Verify newly eligible orders in the storefront account.

Expected: the current eligibility snapshot is recalculated, the idempotent
workflow runs, the old failed issue disappears after success, and the audit
event identifies the acting admin without exposing transfer tokens.

## Phase D: Explicit Google Linking

Keep:

```env
CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=live
CUSTOMER_GOOGLE_AUTO_LINK_ENABLED=false
```

1. Register and verify an email/password account using a Google account's exact
   canonical email.
2. Sign in with password.
3. Open Account Settings and select **Connect Google**.
4. Authenticate with the matching Google account.
5. Confirm both login methods appear.
6. Repeat with a different Google email and confirm it is rejected.
7. Replay the callback URL or wait for an intent to expire and confirm it is
   rejected.

Expected: explicit customer-bound linking works while signed-out automatic
linking remains disabled.

## Phase E: Signed-Out Google Auto-Link

```env
CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=live
CUSTOMER_GOOGLE_AUTO_LINK_ENABLED=true
```

Redeploy Medusa server and worker.

1. Prepare a verified email/password customer whose canonical email matches a
   Google account and is not yet Google-linked.
2. Sign out.
3. Select **Continue with Google** using that account.
4. Inspect Admin customer count, providers, security events, and order history.

Expected: Google links to the existing registered customer, no duplicate
customer is created, and `login_method.google.auto_linked` is recorded.

## Phase F: Login-Method Safety

1. Create a Google-only account.
2. In Settings, set a password after recent Google reauthentication.
3. Sign out and verify both Google and password login.
4. Disconnect Google after recent Google reauthentication.
5. Confirm password login remains.
6. For another Google-only account, attempt to disconnect Google without adding
   a password.

Expected: the final usable method cannot be disconnected; recent
reauthentication is required for sensitive changes.

## Phase G: Password Recovery and Verification

1. Request password reset for a registered email/password account.
2. Request it for an unknown email and a guest-only email.
3. Confirm all requests use a non-enumerating response.
4. Open the registered account's reset email and set a new password.
5. Follow the Sign In link, submit the new credentials, and confirm navigation
   and account state update without a manual refresh.
6. Confirm the old password fails.
7. Register a fresh account and confirm it cannot access account features until
   email verification succeeds.

## Phase H: Admin Duplicate-Customer Repair

Only run in staging with `CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=live`.

1. Use an existing duplicate-registered-customer issue, or create two staging
   registered customer records with the exact same normalized email through an
   approved test fixture.
2. Give one record more login methods; if tied, give one more linked orders,
   carts, or tickets.
3. Open Identity Issues.
4. Confirm the Customer column lists the recommended canonical account and the
   number of matching records.
5. Confirm the summary explains the login-method and linked-record counts.
6. Select **Resolve** and verify the confirmation names the canonical account.
7. Complete the merge.

Expected:

- Eligible orders transfer through Medusa order-transfer workflows.
- Active carts, support tickets, and auth identities move to the canonical
  account.
- Only blank canonical profile fields are filled.
- Source customers remain retained but have `has_account=false` and
  `merged_into_customer_id` metadata.
- The duplicate issue disappears and an admin merge audit event is present.
- Repeating the stale browser action returns “Identity issue no longer exists.”

## Phase I: Negative and Security Cases

- Try resolving a row in one browser after another admin already resolved it.
- Try a malformed issue ID through the API.
- Confirm a current customer-owned identity cannot be deleted as orphaned.
- Confirm user/admin/service identities never appear as customer orphan issues.
- Confirm responses and audit events do not expose provider subjects, auth IDs,
  password hashes, OAuth tokens, nonces, or order-transfer tokens.
- Return `CUSTOMER_GOOGLE_AUTO_LINK_ENABLED=false` after testing unless
  signed-out auto-linking is approved for launch.

