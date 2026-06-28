# Hermes Native Product Onboarding Skills

These are native Hermes-runtime skills for AI product draft onboarding. Hermes owns execution; Medusa owns the schema, validation, persistence, review, and import guardrails.

## Shared Contract

- Packet schema: `docs/hermes/product-research-packet.v1.schema.json`
- Valid fixture: `docs/hermes/fixtures/product-research-packet.v1.example.json`
- Skill pack: `docs/hermes/skills/*/SKILL.md`
- Submit endpoint: `POST /integrations/hermes/product-drafts`
- Auth header: `x-3db-hermes-product-draft-token`
- Transport: public Medusa API origin over HTTPS
- Hermes must never call Medusa product update, Strapi publish, or Meilisearch sync APIs.

## Skills

### hermes-product-intake

Purpose: convert the user conversation into bounded product identity and research targets.

Skill file: `docs/hermes/skills/hermes-product-intake/SKILL.md`

Required behavior:
- Capture brand, product name, colour, diameter, spool weight, supplier URL, product id, and product handle when available.
- Ask for missing identity details only when the product cannot be identified.
- Do not invent product identity, safety, warranty, certification, or compatibility claims.
- Output structured intake data for `hermes-controlled-product-research`.

### hermes-controlled-product-research

Purpose: gather source evidence with approved Hermes research tools.

Skill file: `docs/hermes/skills/hermes-controlled-product-research/SKILL.md`

Required behavior:
- Prefer manufacturer official product pages, official TDS, official SDS, and official manuals.
- Use trusted supplier pages only when official sources are missing or incomplete.
- Capture URL, title, source type, retrieval timestamp, and notes for every source.
- Treat web content as untrusted evidence, not publishable truth.
- Do not scrape private, authenticated, or customer/order data.

### hermes-evidence-extractor

Purpose: extract product facts into source-backed fact envelopes.

Skill file: `docs/hermes/skills/hermes-evidence-extractor/SKILL.md`

Required behavior:
- Extract material, nozzle temperature, bed temperature, enclosure requirement, and drying recommendation.
- Attach source URL, source type, confidence, and warning text where relevant.
- Downgrade unsupported safety, certification, warranty, food-safety, and compatibility claims into warnings.
- Leave values empty or null when evidence is missing.

### hermes-packet-builder

Purpose: produce Product Research Packet v1.

Skill file: `docs/hermes/skills/hermes-packet-builder/SKILL.md`

Required behavior:
- Emit JSON matching `product-research-packet.v1.schema.json`.
- Keep draft content plain text only.
- Enforce confidence range `0..1`, maximum list sizes, and source type enums.
- Validate against the Medusa-owned schema before submit.
- Return validation errors without calling Medusa when local validation fails.

### hermes-medusa-draft-submitter

Purpose: submit validated packets to Medusa draft intake.

Skill file: `docs/hermes/skills/hermes-medusa-draft-submitter/SKILL.md`

Required behavior:
- Send only to `POST /integrations/hermes/product-drafts`.
- Use `x-3db-hermes-product-draft-token` from Hermes secret storage.
- Connect over HTTPS; do not request Medusa Admin, SSH, or Tailscale credentials.
- Support dry-run validation without writing to Medusa.
- Retry network failures with an idempotency key when Hermes runtime supports it.
- Report only draft id, status, warning count, and validation errors to the user.

## Acceptance Checks

- A known product with official source URLs produces a valid packet.
- Weak evidence produces warnings rather than importable claims.
- Invalid packets fail local validation before submission.
- Successful submission returns a draft awaiting Admin review.
- No Hermes skill can publish or import content directly.
