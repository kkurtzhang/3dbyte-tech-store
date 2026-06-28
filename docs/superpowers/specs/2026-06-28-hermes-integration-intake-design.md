# Hermes Integration Intake Design

## Problem

Medusa protects every route under `/admin`, so the current
`POST /admin/ai-product-drafts` handler is intercepted by Admin authentication
before the dedicated Hermes token can authorize the request. Giving Hermes a
Medusa Admin credential, SSH access, or Tailscale membership would violate the
MVP trust boundary.

## Decision

Expose one public HTTPS integration endpoint:

```text
POST /integrations/hermes/product-drafts
x-3db-hermes-product-draft-token: <dedicated secret>
```

The route reuses the existing Product Research Packet validation, persistence,
notification, payload-size, and rate-limit behavior. All read, approve, reject,
and import operations remain under `/admin/ai-product-drafts` and continue to
require Medusa Admin authentication.

## Alternatives Considered

1. **Dedicated integration route (selected):** preserves least privilege and
   works for an external Hermes runtime over HTTPS.
2. **Require both Admin and Hermes tokens:** technically small, but grants the
   external agent unnecessary Admin authority and contradicts the original
   security requirements.
3. **Require Tailscale or SSH:** creates infrastructure coupling and operational
   credentials without replacing application-level authorization.

## Security And Failure Behavior

- Missing or incorrect Hermes token returns `401`.
- Missing server-side token configuration returns `503`.
- Oversized payloads return `413`.
- Rate limiting runs before route processing.
- Invalid packets are persisted as `validation_failed`, matching the existing
  review workflow.
- The former Admin POST handler is removed so there is one intake surface.

## Hermes Contract

The native submitter skill and onboarding documentation must use only the new
integration path. They must continue to forbid Admin tokens, product mutations,
Strapi publishing, Meilisearch synchronization, and private customer data.

## Verification

- Unit tests prove integration intake accepts the dedicated token and preserves
  validation and payload guardrails.
- Contract tests prove the Admin route no longer exports POST, middleware is
  attached to the integration path, and Hermes skills use only that path.
- Backend build and focused AI product draft tests must pass.
