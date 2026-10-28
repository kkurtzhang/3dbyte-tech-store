# Failed GitHub App webhook recovery (prepared, inactive)

This prepares a bounded retry worker for the original **GitHub App push delivery**
to Coolify. It does not call Coolify's deploy API, reconcile arbitrary deployments,
rerun builds or dispatch model evaluations. No workflow, timer or credentials are
enabled by this change. Merging the code alone provides no automatic protection.

## Why this boundary

The October 27 staging push for `b525415003b8d3f38eaccd2d62da801da7297d31`
received HTTP 520 on delivery `9045ecb6-d248-11f1-9ca3-5b63ad8b82d9`.
The underlying Cloudflare/origin cause is unresolved. A non-2xx response can occur
**after** the receiver accepted a deployment. This is not proof that replay is safe.
The incident has already been recovered; do not use these IDs to replay it.

GitHub does not automatically redeliver failed webhooks. Its supported App
redelivery API uses an **App JWT**, not an installation token, PAT or workflow
`GITHUB_TOKEN`. Using that interface preserves GitHub's original payload and
signature. A UUID-targeted Coolify `/deploy` request is a different operation:
the documented endpoint has no exact-SHA or idempotency parameter. We deliberately
do not substitute it, change a resource's pinned commit or generate fake push
payloads.

## Safety policy

`.github/scripts/coolify-recovery/run.mjs --once` runs one reconciliation tick.
All of these conditions must hold before it requests redelivery:

- Explicit opt-in and a separately completed receiver safety review.
- The fixed repository `kkurtzhang/3dbyte-tech-store`, original `push` event,
  `refs/heads/staging`, exact 40-character payload SHA and exact expected Coolify
  App webhook URL. Deleted/forced pushes and other events are excluded.
- GitHub's current staging SHA still matches, and the latest result of **each of
  the eight CI checks** on that exact SHA is completed/successful and produced by
  GitHub Actions. Pending, missing, failed and spoofed checks block retry.
- The visible Coolify inventory contains exactly one same-repository/staging
  resource, with the configured UUID, auto-deploy enabled and no mismatching
  commit pin. App-level replay can fan out; see the required review below.
- The deployed storefront SHA differs, the application history has **no record
  whatsoever** for the target SHA, and there are no active/unknown-status records
  or queued/in-progress deployments for this resource. Finished, failed or
  cancelled target records prove acceptance and suppress replay.
- Complete application history is fetched with `take=50`/`skip` pagination (up to
  1,000 rows); GitHub delivery/check histories follow same-endpoint pagination
  (up to 50 pages). Malformed, unavailable, repeated or capped histories block
  retry. The active deployment endpoint is checked independently as well.
- Absence is confirmed on separate ticks at least 60 seconds apart. Queue/guard
  changes reset that window. All safety guards and age are refreshed again
  immediately before persisting intent and making the POST.

Only transport failures, HTTP 408/429 and 5xx delivery results are candidates.
Other 4xx results require operator repair. Delivery success without a deployment
is a terminal diagnostic (for example, watch paths or disabled deployments), not
a reason to build repeatedly.

Limits are fixed in `recover.mjs`: at most **three redeliveries per resource/SHA**,
original delivery age at most **six hours**, exponential delays starting at
60 seconds with ±25% jitter, capped at 15 minutes. Existing GitHub redeliveries
count toward the same limit. Jitter deadlines and attempts survive process
restarts. A tick never sleeps through this policy delay: the future scheduler
invokes another tick after `nextAt`. GET transport/transient failures have at most
three attempts, bounded backoff, Retry-After handling, 10-second requests and a
90-second overall request budget. Credentialed redirects are forbidden and JSON
responses are capped at 2 MiB.

The non-idempotent redelivery **POST is issued once**. An fsynced intent is saved
before it. HTTP 202 means requested, not delivered or deployed. The worker waits
for a new delivery receipt with the same GUID; if none appears within two minutes,
or the POST itself returns a transient error/times out, it stops with
`uncertain-redelivery`. Never blindly retry an uncertain request.

## Required setup and approval before enablement

This task did not access an App private key/JWT, change a webhook or grant any new
access. These steps remain separate work requiring approval:

1. Review the **installed** Coolify receiver/version, not just upstream code.
   Verify it takes the exact push payload SHA, keeps deployment history longer
   than the retry window and has receiver-side concurrency/duplicate protection.
   Review *all* resources targeted by the App registration across teams, including
   resources invisible to the worker's team-scoped API token. API inventory alone
   cannot prove App-wide isolation. If receiver safety cannot be established,
   leave automatic replay disabled and use terminal diagnostics/manual recovery.
2. Have the App owner provide a short-lived App JWT through an approved credential
   broker on each invocation. The worker accepts `GITHUB_APP_JWT` but never reads
   a private-key file, mints an installation token or stores a JWT. Do not put an
   expiring JWT into a permanent Actions secret. This is additional App authority;
   the existing repo/workflow token cannot replace it.
3. Provide existing, appropriately confined read access: `GITHUB_READ_TOKEN`
   needs repository contents/checks read; `COOLIFY_API_TOKEN` needs application
   inventory, deployment history and active queue read. No Coolify deploy/write
   capability is needed. Confirm access without printing token values or resource
   response bodies; those responses may contain sensitive configuration.
4. Create one private, durable state directory on the approved worker host:
   `node .github/scripts/coolify-recovery/run.mjs --initialize-state /absolute/new/private-directory`.
   Use the same filesystem/ledger for **every** worker for this resource. Ephemeral
   GitHub runners and per-run temporary directories are unsuitable. The exclusive
   lock is never expired automatically. After a crash, reconcile any recorded
   intent and receiver state before manually clearing a stale lock; never delete
   the ledger or restore an old ledger to reset limits.
5. Configure the following environment through the approved runner setup. Do not
   reuse a token confined to another workload or change production credentials:

   | Name | Meaning |
   | --- | --- |
   | `COOLIFY_WEBHOOK_RECOVERY_ENABLED` | `true` only after approval; otherwise inert |
   | `COOLIFY_WEBHOOK_RECEIVER_REVIEWED` | `true` only after the receiver/fan-out review |
   | `COOLIFY_WEBHOOK_RECOVERY_STATE_DIR` | private persistent state directory |
   | `GITHUB_APP_JWT` | fresh App-owner JWT for this invocation |
   | `GITHUB_READ_TOKEN` | repository/checks read token |
   | `COOLIFY_API_TOKEN` | Coolify read token |
   | `COOLIFY_API_URL` | trusted HTTPS origin, without `/api/v1` or credentials |
   | `COOLIFY_STAGING_APPLICATION_UUID` | reviewed staging resource |
   | `COOLIFY_APP_WEBHOOK_URL` | exact HTTPS `/webhooks/source/github/events` URL |

6. Only after those reviews, approve a single scheduler on that host (for example,
   one tick per minute). No scheduler definition is installed by this PR. Forward
   nonzero exits to the owner's already-approved operational alerting; this worker
   sends no external notifications. Keep an actionable terminal alert rather than
   resetting a ledger, invoking a deploy fallback or retrying permanently.

## Audit and operator response

The CLI emits one JSON summary and appends `audit.jsonl` to the private state
folder. It includes status, exact SHA, delivery ID/GUID and attempts/nextAt where
relevant, with an action on terminal conditions. Raw HTTP bodies, headers, payloads
and credentials are excluded. The intent ledger is atomic and fsynced before the
POST; it remains the authority if the process crashes before an audit entry.

`redelivery-requested` / `awaiting-delivery` are not deployment success. Check the
new delivery outcome and exact-SHA Coolify queue/history, then independently verify
service health and `releaseSha`. Terminal results include age/attempt limits,
permanent delivery failure, rejected/uncertain redelivery, unsafe scope,
failed/cancelled or finished-but-not-current deployments, delivered-without-deployment
and failed reads/state. Observing a queued/in-progress accepted deployment is a
normal suppression, not a terminal alert. Resolve
the stated condition first. A `locked` result means another worker (or a crash
lock) owns the resource; do not start another worker using a different directory.

This is client-side suppression and durable intent, **not an exactly-once delivery
guarantee**. Human redelivery, another host with different state, an original
request still being processed or a staging push arriving after the final check
can race it. Receiver-side idempotency/concurrency review is an enablement
prerequisite, not an assertion that the installed Coolify instance already has
those guarantees. The unchanged original payload pins its SHA, but cross-service
branch checks cannot be atomic with GitHub accepting a redelivery request.

The existing evaluation readiness script is read-only. It now searches up to
20 history pages instead of assuming the newest record is the target, and logs
incomplete/unavailable history distinctly from missing. It never requests
redelivery. Workflow/diagnostic-only commits skip paid model evaluation;
assistant runtime and actual eval-case changes retain their existing behavior,
and explicit manual evaluation remains available.

## Offline verification and references

Run `node --experimental-test-coverage --test .github/scripts/__tests__/coolify*.test.mjs`
and the existing `wait-for-staging-release` / `decide-ai-assistant-eval` shell tests.
These use mocked APIs, synthetic tokens, fake time or temporary private state. No
real webhooks, deployments, paid providers or credentials are needed.

- [GitHub failed deliveries](https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries)
- [GitHub App automatic redelivery and JWT requirements](https://docs.github.com/en/webhooks/using-webhooks/automatically-redelivering-failed-deliveries-for-a-github-app-webhook)
- [GitHub App delivery API](https://docs.github.com/en/rest/apps/webhooks)
- [Coolify application history and pagination](https://coolify.io/docs/api/endpoints/deployments/list-deployments-by-app-uuid)
- [Coolify active queue API](https://coolify.io/docs/api/endpoints/deployments/list-deployments)
- [Coolify resource deploy API](https://coolify.io/docs/api/endpoints/deployments/deploy-by-tag-or-uuid)
- [Upstream receiver](https://github.com/coollabsio/coolify/blob/v4.x/app/Http/Controllers/Webhook/Github.php) and [queue admission](https://github.com/coollabsio/coolify/blob/v4.x/bootstrap/helpers/applications.php): illustrative current upstream behavior, **not verification of the installed version**.
