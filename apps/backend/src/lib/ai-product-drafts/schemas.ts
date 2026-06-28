import { z } from "@medusajs/framework/zod"

const nonEmptyTrimmedString = z.string().trim().min(1)
const optionalTrimmedString = z.string().trim()
const confidence = z.number().min(0).max(1)
const nullableNumber = z.number().finite().nullable()
const nullableBoolean = z.boolean().nullable()

const urlString = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^https?:\/\/[^\s]+$/i.test(value),
    "Must be an empty string or an http(s) URL"
  )

export const ProductResearchSourceTypeSchema = z.enum([
  "manufacturer_official",
  "official_product_page",
  "official_tds",
  "official_sds",
  "official_manual",
  "trusted_supplier",
  "supplier_product_page",
  "other",
])

export const FactSourceTypeSchema = z.union([
  z.literal(""),
  z.literal("official_product_page"),
  z.literal("official_tds"),
  z.literal("official_sds"),
  z.literal("official_manual"),
  z.literal("trusted_supplier"),
  z.literal("supplier_product_page"),
  z.literal("manufacturer_official"),
  z.literal("other"),
])

const sourcedStringFact = z
  .object({
    value: optionalTrimmedString,
    source_url: urlString,
    source_type: FactSourceTypeSchema,
    confidence,
    warning: optionalTrimmedString.optional(),
  })
  .strict()

const sourcedRangeFact = z
  .object({
    min: nullableNumber,
    max: nullableNumber,
    source_url: urlString,
    source_type: FactSourceTypeSchema,
    confidence,
    warning: optionalTrimmedString.optional(),
  })
  .strict()

const sourcedBooleanFact = z
  .object({
    value: nullableBoolean,
    source_url: urlString,
    source_type: FactSourceTypeSchema,
    confidence,
    warning: optionalTrimmedString.optional(),
  })
  .strict()

export const ProductResearchPacketSchema = z
  .object({
    packet_version: z.literal(1),
    source_agent: z.literal("hermes"),
    product_id: optionalTrimmedString.max(120).optional().default(""),
    product_handle: optionalTrimmedString.max(200).optional().default(""),
    product_input: z
      .object({
        brand: optionalTrimmedString.max(120),
        product_name: optionalTrimmedString.max(200),
        colour: optionalTrimmedString.max(80),
        diameter_mm: nullableNumber,
        spool_weight_g: nullableNumber,
        supplier_url: urlString,
      })
      .strict(),
    source_summary: z
      .object({
        official_product_page: urlString,
        official_tds: urlString,
        official_sds: urlString,
        trusted_supplier_pages: z.array(urlString).max(10),
      })
      .strict(),
    facts: z
      .object({
        material: sourcedStringFact,
        recommended_nozzle_temp_c: sourcedRangeFact,
        recommended_bed_temp_c: sourcedRangeFact,
        requires_enclosure: sourcedBooleanFact,
        drying_recommended: sourcedBooleanFact,
      })
      .strict(),
    draft_content: z
      .object({
        short_description: optionalTrimmedString.max(500),
        feature_bullets: z.array(optionalTrimmedString.max(180)).max(8),
        seo_title: optionalTrimmedString.max(70),
        seo_description: optionalTrimmedString.max(160),
        ai_search_keywords: z.array(optionalTrimmedString.max(60)).max(30),
      })
      .strict(),
    related_content_suggestions: z
      .array(
        z
          .object({
            handle: optionalTrimmedString.max(200),
            reason: optionalTrimmedString.max(300),
            confidence,
          })
          .strict()
      )
      .max(20),
    sources: z
      .array(
        z
          .object({
            url: urlString,
            source_type: ProductResearchSourceTypeSchema,
            title: optionalTrimmedString.max(200),
            retrieved_at: z.string().datetime(),
            notes: optionalTrimmedString.max(500),
          })
          .strict()
      )
      .max(20),
    warnings: z.array(optionalTrimmedString.max(400)).max(30),
  })
  .strict()

const metadataStringArray = z.array(nonEmptyTrimmedString).max(40)
const temperatureRange = z
  .object({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .strict()

export const AiCoreMetadataSchema = z
  .object({
    schema_version: z.literal(1),
    product_kind: optionalTrimmedString.optional(),
    audience: metadataStringArray.optional(),
    best_for: metadataStringArray.optional(),
    not_recommended_for: metadataStringArray.optional(),
    compatibility_notes: metadataStringArray.optional(),
    care_or_safety_notes: metadataStringArray.optional(),
    ai_search_keywords: metadataStringArray.optional(),
  })
  .strict()

export const ThreeDPrintingMetadataSchema = z
  .object({
    schema_version: z.literal(1),
    product_kind: optionalTrimmedString.optional(),
    material: optionalTrimmedString.optional(),
    diameter_mm: z.number().finite().optional(),
    nozzle_diameter_mm: z.number().finite().optional(),
    recommended_nozzle_temp_c: temperatureRange.optional(),
    recommended_bed_temp_c: temperatureRange.optional(),
    max_temperature_c: z.number().finite().optional(),
    requires_enclosure: z.boolean().optional(),
    requires_hardened_nozzle: z.boolean().optional(),
    drying_recommended: z.boolean().optional(),
    compatible_printers: metadataStringArray.optional(),
    compatible_build_surfaces: metadataStringArray.optional(),
    best_for: metadataStringArray.optional(),
    not_recommended_for: metadataStringArray.optional(),
    common_issues: metadataStringArray.optional(),
    ai_search_keywords: metadataStringArray.optional(),
  })
  .strict()

export const RcModelBuildingMetadataSchema = z
  .object({
    schema_version: z.literal(1),
    component_role: optionalTrimmedString.optional(),
    compatible_project_types: metadataStringArray.optional(),
    voltage: optionalTrimmedString.optional(),
    connector_type: optionalTrimmedString.optional(),
    used_for: metadataStringArray.optional(),
    best_for: metadataStringArray.optional(),
    ai_search_keywords: metadataStringArray.optional(),
  })
  .strict()

export const InternalAiProductDraftSchema = z
  .object({
    schema_version: z.literal(1),
    target_product: z
      .object({
        product_id: optionalTrimmedString.optional(),
        product_handle: optionalTrimmedString.optional(),
        product_title: optionalTrimmedString.optional(),
      })
      .strict(),
    metadata: z
      .object({
        ai_core: AiCoreMetadataSchema.optional(),
        three_d_printing: ThreeDPrintingMetadataSchema.optional(),
        rc_model_building: RcModelBuildingMetadataSchema.optional(),
      })
      .strict(),
    content_draft: z
      .object({
        short_description: optionalTrimmedString.max(500),
        feature_bullets: z.array(optionalTrimmedString.max(180)).max(8),
        seo_title: optionalTrimmedString.max(70),
        seo_description: optionalTrimmedString.max(160),
        ai_search_keywords: z.array(optionalTrimmedString.max(60)).max(30),
      })
      .strict(),
    related_content_suggestions: z
      .array(
        z
          .object({
            handle: optionalTrimmedString.max(200),
            reason: optionalTrimmedString.max(300),
            confidence,
          })
          .strict()
      )
      .max(20),
    product_document_suggestions: z
      .array(
        z
          .object({
            title: optionalTrimmedString.max(200),
            document_type: z.enum([
              "manual",
              "datasheet",
              "install_guide",
              "safety_sheet",
              "warranty",
              "other",
            ]),
            source_url: urlString,
            source_kind: z.enum([
              "official_product_page",
              "official_manual",
              "official_datasheet",
              "official_safety_sheet",
              "supplier_product_page",
              "generated_reference",
            ]),
            source_label: optionalTrimmedString.max(120),
            source_checked_at: z.string().datetime(),
            search_keywords: z.array(optionalTrimmedString.max(60)).max(20),
            confidence,
          })
          .strict()
      )
      .max(20),
    claim_evidence: z
      .array(
        z
          .object({
            claim_path: nonEmptyTrimmedString.max(200),
            value: z.unknown(),
            source_url: urlString,
            source_type: FactSourceTypeSchema,
            confidence,
          })
          .strict()
      )
      .max(80),
    warnings: z.array(optionalTrimmedString.max(500)).max(80),
    confidence_summary: z
      .object({
        overall: confidence,
        metadata: confidence,
        content: confidence,
        documents: confidence,
      })
      .strict(),
  })
  .strict()

export type ProductResearchPacket = z.infer<typeof ProductResearchPacketSchema>
export type InternalAiProductDraft = z.infer<typeof InternalAiProductDraftSchema>
