import type { InternalAiProductDraft } from "./schemas"

const AI_METADATA_KEYS = [
  "ai_core",
  "three_d_printing",
  "rc_model_building",
] as const

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function mergeAiProductDraftMetadata(
  existingMetadata: unknown,
  draftMetadata: InternalAiProductDraft["metadata"]
) {
  const existing = asRecord(existingMetadata)
  const metadata = Object.fromEntries(
    Object.entries(existing).filter(
      ([key]) => !AI_METADATA_KEYS.includes(key as (typeof AI_METADATA_KEYS)[number])
    )
  )

  return {
    ...metadata,
    ...draftMetadata,
  }
}
