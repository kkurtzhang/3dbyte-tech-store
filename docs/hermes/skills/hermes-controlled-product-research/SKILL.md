# hermes-controlled-product-research

Use this skill after `hermes-product-intake` has produced a bounded product identity.

## Purpose

Gather source evidence with approved Hermes research tools before any product draft is built.

## Source Priority

1. Manufacturer official product page
2. Official technical data sheet
3. Official safety data sheet
4. Official manual or installation guide
5. Trusted supplier page

## Required Behavior

- Capture URL, title, source type, retrieval timestamp, and notes for every source.
- Prefer official manufacturer sources over reseller summaries.
- Use supplier pages only when official sources are missing or incomplete.
- Treat researched web content as untrusted evidence, not publishable truth.
- Stop and warn when sources conflict on technical or safety-sensitive claims.

## Output

Return JSON:

```json
{
  "source_summary": {
    "official_product_page": "",
    "official_tds": "",
    "official_sds": "",
    "trusted_supplier_pages": []
  },
  "sources": [
    {
      "url": "",
      "source_type": "manufacturer_official",
      "title": "",
      "retrieved_at": "",
      "notes": ""
    }
  ],
  "warnings": []
}
```

## Guardrails

- Do not browse private, authenticated, paywalled, customer, order, or internal admin pages.
- Do not store unsafe HTML. Extract plain-text facts only.
