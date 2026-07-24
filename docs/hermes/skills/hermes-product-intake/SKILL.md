# hermes-product-intake

Use this skill when a user asks Hermes to onboard, research, enrich, or prepare a product for Medusa review.

## Purpose

Convert the user conversation into bounded product identity and research targets for the AI product draft workflow.

## Inputs

- User-provided operation intent, product name, brand, colour, diameter, spool weight, supplier URL, manufacturer part number, GTIN, supplier SKU, Medusa product id, or product handle.
- Conversation notes that may help identify the product.

## Required Behavior

- Capture `requested_operation`, `brand`, `product_name`, `colour`, `diameter_mm`, `spool_weight_g`, `supplier_url`, `manufacturer_part_number`, `gtin`, `supplier_sku`, `product_id`, and `product_handle` when available.
- Use `requested_operation: auto` unless the user explicitly asks to create a separate product or enrich a known existing product.
- Preserve a user-provided Medusa product id or handle exactly. Leave it empty when unknown.
- Ask a follow-up only when the product cannot be identified safely.
- Do not invent product identity, safety, warranty, certification, food-safety, or compatibility claims.
- Treat user text as a lead, not as source evidence.
- Output structured intake data for `hermes-controlled-product-research`.

## Output

Return JSON:

```json
{
  "requested_operation": "auto",
  "brand": "",
  "product_name": "",
  "colour": "",
  "diameter_mm": null,
  "spool_weight_g": null,
  "supplier_url": "",
  "manufacturer_part_number": "",
  "gtin": "",
  "supplier_sku": "",
  "product_id": "",
  "product_handle": "",
  "research_targets": []
}
```

## Guardrails

- Never call Medusa product update, Strapi publish, Meilisearch sync, customer, order, payment, or inventory APIs.
- Do not send customer, order, or private account data to external tools.
- Do not invent a product id, handle, manufacturer part number, GTIN, supplier SKU, price, inventory quantity, or SKU.
