# hermes-packet-builder

Use this skill after intake, research, and evidence extraction are complete.

## Purpose

Build Product Research Packet v1 exactly as Medusa expects it.

## Contract

- Schema: `docs/hermes/product-research-packet.v1.schema.json`
- Example: `docs/hermes/fixtures/product-research-packet.v1.example.json`
- Packet version: `1`
- Source agent: `hermes`

## Required Behavior

- Emit JSON only.
- Keep draft content plain text only.
- Enforce confidence range `0..1`, maximum list sizes, and source type enums.
- Validate locally against the Medusa-owned schema before submission.
- Return validation errors to Hermes without calling Medusa when local validation fails.

## Output

Return a complete Product Research Packet v1:

```json
{
  "packet_version": 1,
  "source_agent": "hermes",
  "product_id": "",
  "product_handle": "",
  "product_input": {},
  "source_summary": {},
  "facts": {},
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
