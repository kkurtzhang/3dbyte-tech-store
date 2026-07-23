type ProductCompatibilityPanelProps = {
  metadata?: Record<string, unknown> | null
}

type GuidanceItem = {
  label: string
  value: string
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null

const asStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map(asString)
        .filter((item): item is string => item !== null)
        .slice(0, 8)
    : []

const joined = (value: unknown): string | null => {
  const items = asStringList(value)
  return items.length ? items.join(", ") : null
}

function buildGuidance(metadata: Record<string, unknown>) {
  const aiCore = asRecord(metadata.ai_core)
  const printing = asRecord(metadata.three_d_printing)
  const rc = asRecord(metadata.rc_model_building)

  if (!aiCore && !printing && !rc) return null

  const electrical = [asString(rc?.voltage), asString(rc?.connector_type)]
    .filter((item): item is string => item !== null)
    .join(" · ")
  const requirements = [
    printing?.requires_enclosure === true ? "Enclosure required" : null,
    printing?.requires_hardened_nozzle === true
      ? "Hardened nozzle required"
      : null,
    printing?.drying_recommended === true ? "Drying recommended" : null,
  ].filter((item): item is string => item !== null)
  const notes = [
    ...asStringList(aiCore?.compatibility_notes),
    ...asStringList(printing?.compatibility_notes),
  ]

  const items: Array<GuidanceItem | null> = [
    joined(printing?.compatible_printers)
      ? {
          label: "Compatible printers",
          value: joined(printing?.compatible_printers)!,
        }
      : null,
    joined(printing?.compatible_build_surfaces)
      ? {
          label: "Build surfaces",
          value: joined(printing?.compatible_build_surfaces)!,
        }
      : null,
    joined(rc?.compatible_project_types)
      ? {
          label: "Project types",
          value: joined(rc?.compatible_project_types)!,
        }
      : null,
    electrical ? { label: "Electrical", value: electrical } : null,
    requirements.length
      ? { label: "Requirements", value: requirements.join(", ") }
      : null,
    joined(aiCore?.best_for) || joined(printing?.best_for) || joined(rc?.best_for)
      ? {
          label: "Best for",
          value:
            joined(aiCore?.best_for) ||
            joined(printing?.best_for) ||
            joined(rc?.best_for)!,
        }
      : null,
  ]

  const guidance = items.filter((item): item is GuidanceItem => item !== null)

  return guidance.length || notes.length ? { guidance, notes } : null
}

export function ProductCompatibilityPanel({
  metadata,
}: ProductCompatibilityPanelProps) {
  if (!metadata) return null

  const content = buildGuidance(metadata)
  if (!content) return null

  return (
    <section className="rounded-sm border bg-card p-5">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-wider">
        Compatibility &amp; use
      </h2>
      {content.guidance.length ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {content.guidance.map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-1 text-sm">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {content.notes.length ? (
        <div className="mt-4 rounded-sm border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          {content.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
    </section>
  )
}
