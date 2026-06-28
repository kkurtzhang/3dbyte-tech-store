# hermes-evidence-extractor

Use this skill after source pages, TDS files, SDS files, or supplier pages have been collected.

## Purpose

Extract product facts into source-backed fact envelopes for Product Research Packet v1.

## Required Facts

- `material`
- `recommended_nozzle_temp_c`
- `recommended_bed_temp_c`
- `requires_enclosure`
- `drying_recommended`

## Required Behavior

- Attach `source_url`, `source_type`, `confidence`, and optional `warning` to every extracted fact.
- Leave string values empty when evidence is missing.
- Leave numeric ranges and booleans as `null` when evidence is missing.
- Downgrade unsupported safety, certification, warranty, food-safety, and compatibility claims into warnings.
- Prefer exact source wording for evidence notes, but do not copy long page text into the packet.

## Output

Return JSON:

```json
{
  "facts": {
    "material": {
      "value": "",
      "source_url": "",
      "source_type": "",
      "confidence": 0
    },
    "recommended_nozzle_temp_c": {
      "min": null,
      "max": null,
      "source_url": "",
      "source_type": "",
      "confidence": 0,
      "warning": ""
    },
    "recommended_bed_temp_c": {
      "min": null,
      "max": null,
      "source_url": "",
      "source_type": "",
      "confidence": 0,
      "warning": ""
    },
    "requires_enclosure": {
      "value": null,
      "source_url": "",
      "source_type": "",
      "confidence": 0
    },
    "drying_recommended": {
      "value": null,
      "source_url": "",
      "source_type": "",
      "confidence": 0
    }
  },
  "warnings": []
}
```

## Guardrails

- Any claim without source evidence must remain a warning, not a publishable field.
- Never infer product safety or compliance from broad material knowledge alone.
