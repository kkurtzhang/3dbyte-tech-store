import { z } from "@medusajs/framework/zod"

export const ProductKindSchema = z.enum([
  "filament", "hotend", "nozzle", "build_plate", "extruder", "sensor",
  "controller", "motor", "fan", "power_supply", "tool", "hardware", "accessory",
])
export type ProductKind = z.infer<typeof ProductKindSchema>
export const FactFieldSchema = z.enum([
  "material", "diameter_mm", "nozzle_diameter_mm", "recommended_nozzle_temp_c",
  "recommended_bed_temp_c", "max_temperature_c", "requires_enclosure",
  "requires_hardened_nozzle", "drying_recommended", "compatible_printers",
  "compatible_build_surfaces", "voltage_v", "current_a", "power_w",
  "connector_type", "dimensions_mm", "thread",
])
export type FactField = z.infer<typeof FactFieldSchema>

const filamentOnly = new Set<FactField>([
  "diameter_mm", "recommended_nozzle_temp_c", "recommended_bed_temp_c",
  "requires_enclosure", "requires_hardened_nozzle", "drying_recommended",
  "compatible_build_surfaces",
])
export function isFieldApplicable(kind: ProductKind, field: FactField) {
  if (filamentOnly.has(field)) return kind === "filament"
  if (field === "nozzle_diameter_mm" || field === "thread") return ["nozzle", "hotend"].includes(kind)
  if (["voltage_v", "current_a", "power_w", "connector_type"].includes(field)) {
    return ["hotend", "extruder", "sensor", "controller", "motor", "fan", "power_supply", "accessory"].includes(kind)
  }
  if (field === "max_temperature_c") return ["hotend", "nozzle", "build_plate", "tool"].includes(kind)
  return true
}
export const requiredFacts: Record<ProductKind, FactField[]> = {
  filament: ["material", "diameter_mm", "recommended_nozzle_temp_c", "recommended_bed_temp_c"],
  hotend: ["max_temperature_c", "compatible_printers"],
  nozzle: ["material", "nozzle_diameter_mm", "thread"],
  build_plate: ["material", "dimensions_mm", "compatible_printers"],
  extruder: ["compatible_printers"],
  sensor: ["compatible_printers", "connector_type"],
  controller: ["voltage_v", "connector_type"],
  motor: ["voltage_v", "current_a"],
  fan: ["voltage_v", "dimensions_mm", "connector_type"],
  power_supply: ["voltage_v", "current_a", "power_w"],
  tool: ["material"],
  hardware: ["material", "dimensions_mm"],
  accessory: ["compatible_printers"],
}
const range = z.object({ min: z.number().min(-100).max(1000), max: z.number().min(-100).max(1000) })
  .strict().refine(v => v.min <= v.max, "Minimum must not exceed maximum")
const strings = z.array(z.string().trim().min(1).max(160)).min(1).max(30)
export const factValueSchemas = {
  material: z.string().trim().min(1).max(200),
  diameter_mm: z.number().positive().max(10),
  nozzle_diameter_mm: z.number().positive().max(10),
  recommended_nozzle_temp_c: range,
  recommended_bed_temp_c: range,
  max_temperature_c: z.number().positive().max(1500),
  requires_enclosure: z.boolean(), requires_hardened_nozzle: z.boolean(), drying_recommended: z.boolean(),
  compatible_printers: strings, compatible_build_surfaces: strings,
  voltage_v: z.number().positive().max(1000), current_a: z.number().positive().max(1000),
  power_w: z.number().positive().max(100000),
  connector_type: z.string().trim().min(1).max(160),
  dimensions_mm: z.string().trim().min(1).max(160),
  thread: z.string().trim().min(1).max(160),
}
export const ResearchEvidenceSchema = z.object({
  source_ids: z.array(z.string().trim().min(1).max(80)).max(10),
  evidence_excerpt: z.string().trim().max(1000),
  confidence: z.number().min(0).max(1),
  warning: z.string().trim().max(400).default(""),
}).strict()
export const ResearchFactSchema = ResearchEvidenceSchema.extend({
  field: FactFieldSchema,
  applicability: z.enum(["known", "unknown", "not_applicable"]),
  value: z.union([z.string(), z.number().finite(), z.boolean(), z.array(z.string()), range, z.null()]),
}).strict().superRefine((fact, ctx) => {
  if (fact.applicability !== "known") {
    if (fact.value !== null) ctx.addIssue({ code: "custom", path: ["value"], message: "Unknown or inapplicable facts must have a null value" })
  } else if (!factValueSchemas[fact.field].safeParse(fact.value).success) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Invalid value or unit for this fact" })
  }
})

