# hermes-evidence-extractor

Use this skill after exact-product source pages have been collected.

## Purpose

Produce typed, source-backed facts and copy evidence for Product Research Packet v3.

## Required Behavior

- First classify the product with a supported kind and exact-product evidence. Never default to filament.
- Follow the category requirements and units in `docs/hermes/quality-recovery-v3.md` and the canonical v3 schema.
- Emit facts as an array of `{ field, applicability, value, source_ids, evidence_excerpt, confidence, warning }`.
- Use `applicability: known` only for directly supported values. Otherwise use `unknown` or `not_applicable` and `value: null`; never invent a zero, false, range, or compatibility list.
- A hotend's maximum rating belongs in `max_temperature_c`, never `recommended_nozzle_temp_c`. Filament print settings must never appear on hardware.
- Attach existing source IDs and short, relevant excerpts to classification, every known fact, and every nonempty copy field.
- Copy evidence paths are `short_description`, `seo_title`, `seo_description`, `feature_bullets.0`, and `ai_search_keywords.0` (one indexed entry per list item).
- Keep excerpts concise; do not reproduce long copyrighted passages. An excerpt must support all claims in its associated copy.
- Preserve contradictions, variant ambiguity, and inference caveats. Confidence is a researcher estimate, not calibrated accuracy. Do not raise it merely to pass a gate.
- Exact-product evidence means the exact variant and model year, not a similar product family. Family/background sources may remain as references but cannot support approval.
- Keep unsupported specifications and marketing assertions out of copy, even when omitted from metadata.
- Consult the synthetic v3 fixture for structure only; its Example products and sources are not real evidence.

## Guardrails

- Missing evidence means more research, never an invented source, excerpt, or attribute.
- Never infer product safety, certification, food contact, warranty, performance, or compatibility from generic material knowledge.
- Never infer prices, inventory, SKUs, publication state, or catalogue identity.
- Do not promote the existing v1/v2 facts into v3 evidence without checking the sources again.
