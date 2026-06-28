# hermes-medusa-draft-submitter

Use this skill only after `hermes-packet-builder` has produced a locally valid Product Research Packet v1.

## Purpose

Submit validated packets to Medusa draft intake so an admin can review them.

## Endpoint

- Method: `POST`
- Path: `/integrations/hermes/product-drafts`
- Header: `x-3db-hermes-product-draft-token`
- Body: Product Research Packet v1 JSON
- Transport: configured Medusa API origin over HTTPS

## Required Behavior

- Use the dedicated Hermes product draft token from Hermes secret storage.
- Send only to the draft intake endpoint.
- Treat `401` as a missing or invalid Hermes token and stop without retrying.
- Treat `413` as an oversized packet and return to packet construction.
- Treat `429` as a rate limit and retry only after a conservative delay.
- Support dry-run validation without writing to Medusa when the Hermes runtime supports dry runs.
- Retry network failures conservatively. Use an idempotency key when the runtime supports it.
- Report only draft id, status, warning count, and validation errors to the user.

## Success Response Handling

Treat `needs_review` as success. The admin must still approve and import the draft.

## Guardrails

- Never call Medusa product update routes.
- Never call Strapi publish routes.
- Never call Meilisearch sync routes.
- Never use a Medusa admin token for Hermes intake.
- Never request or use SSH credentials.
- Never require Tailscale membership for draft submission.
- Never submit customer, order, payment, or private account data.
