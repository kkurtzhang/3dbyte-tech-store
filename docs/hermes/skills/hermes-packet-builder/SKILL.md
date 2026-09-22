# hermes-packet-builder

Use this skill after intake, research, and evidence extraction are complete.

## Purpose

Build Product Research Packet v3 exactly as Medusa expects it.

## Contract

- Schema: `docs/hermes/product-research-packet.v3.schema.json`
- Example: `docs/hermes/fixtures/product-research-packet.v3.example.json`
- Packet version: `3`
- Source agent: `hermes`

## Required Behavior

- Emit JSON only.
- Read `docs/hermes/quality-recovery-v3.md`. Include explicit product classification, typed facts, and per-copy-field evidence; do not mechanically upgrade v1/v2 packets.
- The example is synthetic and must never be submitted as real product research. The JSON outline below is not a valid completed packet.
- Create one stable `request_id` for the logical onboarding job. Reuse it unchanged for validation retries and submission retries.
- Set `requested_operation` to `auto`, `create`, or `enrich` from intake. Prefer `auto`.
- Populate top-level `product_id` or `product_handle` only when targeting a confirmed existing Medusa product. Leave both empty for new-product `auto` or `create` packets; do not put a proposed new handle in the target fields.
- Keep unknown identity fields as empty strings.
- Keep draft content plain text only.
- Enforce confidence range `0..1`, maximum list sizes, and source type enums.
- Validate locally against the Medusa-owned schema before submission.
- Return validation errors to Hermes without calling Medusa when local validation fails.

## Output

Return a complete Product Research Packet v3:

```json
{
  "packet_version": 3,
  "source_agent": "hermes",
  "request_id": "hermes:stable-job-id",
  "requested_operation": "auto",
  "product_id": "",
  "product_handle": "",
  "product_input": {},
  "source_summary": {},
  "classification": {},
  "facts": [],
  "content_evidence": [],
  "draft_content": {},
  "related_content_suggestions": [],
  "sources": [],
  "warnings": []
}
```

## Guardrails

- Do not include raw HTML from external pages.
- Do not include private customer, order, payment, or admin data.
- Do not convert unsupported claims into metadata-ready facts.
- Do not invent `product_id`, `product_handle`, `manufacturer_part_number`, `gtin`, `supplier_sku`, prices, inventory quantities, or SKUs.
- Do not change `request_id` when resubmitting the same logical job.
