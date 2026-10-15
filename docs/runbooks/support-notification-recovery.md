# AI ticket email status and authorized recovery

This extends the assistant consent flow with a durable per-recipient delivery journal. It covers the initial customer acknowledgement and support-inbox alert for confirmed AI tickets. Normal contact-form, Admin-reply and order notifications keep their existing behavior.

## Persistence and state meanings

The native ticket transaction also appends two `ai_notification_delivery_state` events to the existing support audit table. Each stores the original recipient and an immutable email snapshot. No new table, migration, dependency, service, credential or worker is required. The existing ticket-event index supports reads by ticket. The ticket/message/consent event and both notification intents commit together or all roll back.

| State   | Meaning                                                                                             | Allowed action                                                                        |
| ------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| pending | Intent is durable; no provider call has started.                                                    | One explicitly authorized send, or the original confirmation request's first attempt. |
| queued  | A versioned attempt is reserved but dispatch has not begun.                                         | Wait/refresh; an expired reservation requires reconciliation.                         |
| unknown | Dispatch may have reached the provider, or its outcome cannot be established.                       | Reconcile only; never automatically retry.                                            |
| sent    | Provider acceptance was recorded by the native response or an authorized Admin's verified evidence. | No resend. This is not inbox delivery confirmation.                                   |
| failed  | An authorized Admin recorded verified non-acceptance and confirmed the original sender is stopped.  | A separate explicit authorization may send one new attempt.                           |

Each transition locks the ticket row in a native PostgreSQL transaction and appends an event with an increasing version. Expected versions reject concurrent actions, stale completion and replay. The queued intent and then the unknown state commit **before** calling the notification module. Provider timeout, provider acceptance followed by native persistence failure, journal-completion failure and process interruption all stay blocked as unknown. An expired queued reservation is displayed as unknown; expiry never reopens a claim. Status reads neither write nor send.

A successful native response must contain success status, notification ID, provider reference, matching recipient and the exact attempt key. Otherwise acceptance remains unknown. The original recipient and first rendered payload are retained across retries; an environment inbox change cannot redirect a retry. Each authorized retry uses a new attempt key, avoiding the pinned native module's failed-row replay/update mismatch. The old row and attempt history are preserved. New keys are safe only after verified non-acceptance and sender quiescence; they do not deduplicate an uncertain older send. At most five attempts per recipient are permitted by this bounded flow.

## Admin workflow and authorization

The ticket list shows customer/internal email states separately. Ticket detail shows the original recipient, state explanation, attempt/version, provider lookup key and provider reference. `sent` explicitly means provider acceptance, not final delivery. The customer preview retains its compatible `queued`/`pending` summary: only two recorded acceptances return queued; all other combinations say the ticket is saved and email may be delayed.

The action endpoint is `POST /admin/support-tickets/:id/notifications`. It requires an active authenticated Medusa Admin user, an existing user record, JSON, exact configured `ADMIN_CORS` origin for browser sessions, and a strict bounded request body. Authenticated bearer clients may omit Origin; customer identities, API-key-only identities, foreign origins, caller-supplied actors/recipients/payloads and unknown fields are rejected. The audit actor comes from verified authentication. No permission or CORS expansion is performed by this change.

1. Refresh and inspect both native notification records and provider outcomes using the displayed key. A failure row, missing acknowledgement or thrown error is not proof of non-delivery.
2. For an unknown/expired queued attempt, wait for the displayed review time (two minutes after reservation/start). This delay is only a guard against immediate races; **elapsed time does not prove the sending process has stopped**.
3. Record a provider case/message reference and evidence (20–2,000 characters). Accepted outcomes become sent without sending. Unresolved outcomes stay blocked. To record non-acceptance, independently verify the original process/request cannot still send, obtain provider confirmation of non-acceptance and explicitly attest both facts. If either cannot be proved, leave unknown. Reconciliation itself never sends email.
4. A separate checkbox and Send one email action authorize a new attempt to the displayed original recipient. Never issue parallel recovery actions, bypass the version check or call the old two-email helper to recover these tickets.
5. If an action returns an error or its response is lost, refresh. Do not assume it failed before sending. Every transition and reconciliation remains in the audit trail.

Existing confirmed tickets without a journal start as unknown; no legacy queue flag or native failure row is automatically treated as delivered or safe to retry. Reconciliation can establish their outcome using the original consent-confirmed inbox. If that inbox is missing, internal recovery is blocked. Tickets without a durable AI-consent proposal cannot use this recovery endpoint. Live provider evidence cannot be verified by this app automatically; the authenticated operator remains responsible for its accuracy and sender quiescence. No exactly-once guarantee is made.

## Deployment and rollback

There is no schema migration or backfill. The prior consent column/index migrations remain required and unchanged. Fresh-install, upgrade and repeat migration tests still run. Deploy consistent backend instances before using recovery actions; do not mix old notification send logic with recovery operations. No deployment is authorized here.

Retain all audit events and native notification rows. A rollback to PR247 can still read tickets/messages but loses the new Admin status and recovery controls; its old queue-event summary can conservatively show pending for new journal-managed deliveries. Disable AI ticket confirmation/recovery during such rollback rather than restoring the unsafe failed-row replay path. Do not delete journal records, reset attempt versions or replace a ticket to force notification delivery. Non-AI notification behavior is unchanged.

## Verification scope

CI runs native PostgreSQL/Medusa support and notification modules against disposable loopback fixtures and a provider restricted to `example.invalid` recipients. It covers transaction rollback, concurrent claims/reconciliation, stale replay, crash before dispatch, provider acceptance followed by native/journal persistence failure, partial failure followed by authorized fresh-attempt recovery, timeout uncertainty, status visibility and consent recovery. Admin browser checks exercise all five states, required evidence, sender-stopped attestation, separate send authorization, mobile layout and recoverable errors. No live email or production data is used; real-provider delivery and operational evidence remain outside this synthetic verification.
