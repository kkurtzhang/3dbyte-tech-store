import type { AiProductMetadataSearchFields } from "@3dbyte-tech-store/shared-types"

type ExpertId =
  | "print_process"
  | "rc_model_building"
  | "compatibility_triage"
  | "support_handoff"

type Confidence = "high" | "medium" | "low"

type AiContext = AiProductMetadataSearchFields

export type ExpertGuidanceProduct = {
  id: string
  title?: string
  handle?: string
  aiContext?: AiContext | null
}

export type ProductExpertSignal = {
  expertId: ExpertId
  confidence: Confidence
  evidence: string[]
  cautions: string[]
}

type ExpertProfile = {
  id: ExpertId
  label: string
  role: string
  useWhen: string
}

type ExpertContext = {
  activeExperts: ExpertProfile[]
  responseRules: string[]
  followUpQuestions: string[]
  supportHandoff: {
    recommended: boolean
    allowedOnlyAfterConfirmation: true
    requiredFields: ["name", "email", "subject", "message"]
    reason: string | null
  }
}

export type ExpertProductGuidance = {
  expertContext: ExpertContext
  productSignalsById: Record<string, ProductExpertSignal[]>
}

const EXPERT_PROFILES: Record<ExpertId, ExpertProfile> = {
  print_process: {
    id: "print_process",
    label: "Print-process expert",
    role: "Ground material, nozzle, bed, drying, enclosure, and build-surface guidance in product metadata.",
    useWhen: "Use for filament, printer, nozzle, hotend, build surface, drying, maintenance, or print-setting questions.",
  },
  rc_model_building: {
    id: "rc_model_building",
    label: "RC model building expert",
    role: "Ground 3DSets-style RC component, electronics, connector, voltage, hardware, and printed-part guidance in product metadata.",
    useWhen: "Use for RC builds, motors, ESCs, servos, batteries, bearings, fasteners, connectors, and 3DSets-style assemblies.",
  },
  compatibility_triage: {
    id: "compatibility_triage",
    label: "Compatibility triage expert",
    role: "Separate known compatibility facts from uncertainty and ask for missing printer, project, variant, voltage, connector, or use-case details.",
    useWhen: "Use whenever the customer asks whether something fits, works with, is required, or is compatible.",
  },
  support_handoff: {
    id: "support_handoff",
    label: "Support handoff expert",
    role: "Recommend a human support ticket only when the customer asks for human confirmation or when compatibility risk remains unresolved.",
    useWhen: "Use when the customer asks for human help, support, ticket creation, or manual compatibility confirmation.",
  },
}

const PRINT_QUERY_TERMS = [
  "print",
  "printer",
  "filament",
  "petg",
  "pla",
  "abs",
  "asa",
  "tpu",
  "nylon",
  "carbon",
  "cf",
  "nozzle",
  "hotend",
  "bed",
  "pei",
  "enclosure",
  "dry",
  "drying",
  "temperature",
]

const RC_QUERY_TERMS = [
  "3dsets",
  "3d sets",
  "rc",
  "radio control",
  "motor",
  "esc",
  "servo",
  "battery",
  "bearing",
  "fastener",
  "connector",
  "xt60",
  "drivetrain",
  "steering",
]

const COMPATIBILITY_QUERY_TERMS = [
  "compatible",
  "compatibility",
  "fit",
  "fits",
  "work with",
  "required",
  "do i need",
  "can i use",
]

const SUPPORT_QUERY_TERMS = [
  "support",
  "ticket",
  "human",
  "person",
  "compatibility help",
  "human check",
  "human confirmation",
]

const REQUIRED_SUPPORT_FIELDS = ["name", "email", "subject", "message"] as const

function normalizeQuery(queryText: string) {
  return queryText.toLowerCase()
}

function includesAny(queryText: string, terms: string[]) {
  const normalizedQuery = normalizeQuery(queryText)

  return terms.some((term) => normalizedQuery.includes(term))
}

function hasAnyContextKey(context: AiContext | null | undefined, prefix: string) {
  return Object.keys(context ?? {}).some((key) => key.startsWith(prefix))
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim())
      )
    : []
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null
}

function compactEvidence(items: Array<string | null | undefined>) {
  return [...new Set(items.filter((item): item is string => Boolean(item)))].slice(0, 6)
}

function buildPrintEvidence(context: AiContext | null | undefined) {
  const productKind = asString(context?.tdp_product_kind)
  const material = asString(context?.tdp_material)
  const hardenedNozzle = asBoolean(context?.tdp_requires_hardened_nozzle)
  const dryingRecommended = asBoolean(context?.tdp_drying_recommended)
  const bestFor = asStringArray(context?.tdp_best_for)
  const commonIssues = asStringArray(context?.tdp_common_issues)

  return compactEvidence([
    productKind ? `print_process product_kind=${productKind}` : null,
    material ? `print_process material=${material}` : null,
    hardenedNozzle !== null
      ? `print_process requires_hardened_nozzle=${hardenedNozzle}`
      : null,
    dryingRecommended !== null
      ? `print_process drying_recommended=${dryingRecommended}`
      : null,
    bestFor.length ? `print_process best_for=${bestFor.join(", ")}` : null,
    commonIssues.length ? `print_process common_issues=${commonIssues.join(", ")}` : null,
  ])
}

function buildRcEvidence(context: AiContext | null | undefined) {
  const componentRole = asString(context?.rcb_component_role)
  const voltage = asString(context?.rcb_voltage)
  const connectorType = asString(context?.rcb_connector_type)
  const projectTypes = asStringArray(context?.rcb_compatible_project_types)
  const usedFor = asStringArray(context?.rcb_used_for)

  return compactEvidence([
    componentRole ? `rc_model_building component_role=${componentRole}` : null,
    voltage ? `rc_model_building voltage=${voltage}` : null,
    connectorType ? `rc_model_building connector_type=${connectorType}` : null,
    projectTypes.length
      ? `rc_model_building project_types=${projectTypes.join(", ")}`
      : null,
    usedFor.length ? `rc_model_building used_for=${usedFor.join(", ")}` : null,
  ])
}

function buildProductSignals(
  product: ExpertGuidanceProduct,
  queryText: string
): ProductExpertSignal[] {
  const context = product.aiContext ?? null
  const printEvidence = buildPrintEvidence(context)
  const rcEvidence = buildRcEvidence(context)
  const needsCompatibilityTriage = includesAny(queryText, COMPATIBILITY_QUERY_TERMS)
  const needsSupportHandoff = includesAny(queryText, SUPPORT_QUERY_TERMS)

  return [
    ...(printEvidence.length
      ? [
          {
            expertId: "print_process" as const,
            confidence: "high" as const,
            evidence: printEvidence,
            cautions: ["Do not infer print settings beyond provided metadata."],
          },
        ]
      : []),
    ...(rcEvidence.length
      ? [
          {
            expertId: "rc_model_building" as const,
            confidence: "high" as const,
            evidence: rcEvidence,
            cautions: ["Do not claim protected 3DSets model-file compatibility."],
          },
        ]
      : []),
    ...(needsCompatibilityTriage
      ? [
          {
            expertId: "compatibility_triage" as const,
            confidence: rcEvidence.length || printEvidence.length ? "medium" as const : "low" as const,
            evidence: [
              "Customer asked a compatibility or fit question; ask for missing project, printer, variant, connector, voltage, or use-case details before a firm answer.",
            ],
            cautions: ["Avoid yes/no compatibility claims when required details are missing."],
          },
        ]
      : []),
    ...(needsSupportHandoff
      ? [
          {
            expertId: "support_handoff" as const,
            confidence: "medium" as const,
            evidence: [
              "Customer wording suggests human confirmation or support handoff may be useful.",
            ],
            cautions: ["Create a ticket only after explicit confirmation and required contact fields."],
          },
        ]
      : []),
  ]
}

function getActiveExpertIds(
  queryText: string,
  products: ExpertGuidanceProduct[],
  productSignalsById: Record<string, ProductExpertSignal[]>
): ExpertId[] {
  const signalIds = products.flatMap((product) =>
    (productSignalsById[product.id] ?? []).map((signal) => signal.expertId)
  )
  const queryIds: ExpertId[] = [
    ...(includesAny(queryText, PRINT_QUERY_TERMS) ? ["print_process" as const] : []),
    ...(includesAny(queryText, RC_QUERY_TERMS) ? ["rc_model_building" as const] : []),
    ...(includesAny(queryText, COMPATIBILITY_QUERY_TERMS)
      ? ["compatibility_triage" as const]
      : []),
    ...(includesAny(queryText, SUPPORT_QUERY_TERMS) ? ["support_handoff" as const] : []),
  ]
  const metadataIds: ExpertId[] = [
    ...(products.some((product) => hasAnyContextKey(product.aiContext, "tdp_"))
      ? ["print_process" as const]
      : []),
    ...(products.some((product) => hasAnyContextKey(product.aiContext, "rcb_"))
      ? ["rc_model_building" as const]
      : []),
  ]

  return [...new Set([...queryIds, ...metadataIds, ...signalIds])]
}

function buildFollowUpQuestions(queryText: string, expertIds: ExpertId[]) {
  const needsCompatibilityTriage = expertIds.includes("compatibility_triage")
  const needsRcDetails = expertIds.includes("rc_model_building")
  const needsPrintDetails = expertIds.includes("print_process")
  const needsSupport = includesAny(queryText, SUPPORT_QUERY_TERMS)

  return [
    ...(needsCompatibilityTriage
      ? ["Which project, printer/model, product variant, and exact use case are you trying to match?"]
      : []),
    ...(needsRcDetails
      ? ["What voltage, connector type, motor/ESC/servo size, and RC project are you building around?"]
      : []),
    ...(needsPrintDetails
      ? ["What material, nozzle type, build surface, and enclosure/drying setup will you use?"]
      : []),
    ...(needsSupport
      ? ["Would you like a human support ticket after we collect your name, email, subject, and message?"]
      : []),
  ]
}

export function buildExpertProductGuidance(
  queryText: string,
  products: ExpertGuidanceProduct[]
): ExpertProductGuidance {
  const productSignalsById = Object.fromEntries(
    products.map((product) => [product.id, buildProductSignals(product, queryText)])
  )
  const activeExpertIds = getActiveExpertIds(queryText, products, productSignalsById)
  const supportRecommended = activeExpertIds.includes("support_handoff")

  return {
    productSignalsById,
    expertContext: {
      activeExperts: activeExpertIds.map((expertId) => EXPERT_PROFILES[expertId]),
      responseRules: [
        "Use only provided product facts; do not infer missing compatibility, safety, stock, price, or discount claims.",
        "Separate known facts from assumptions and ask follow-up questions when compatibility details are incomplete.",
        "Use productUrl exactly when linking products; never use image or thumbnail URLs as product links.",
      ],
      followUpQuestions: buildFollowUpQuestions(queryText, activeExpertIds),
      supportHandoff: {
        recommended: supportRecommended,
        allowedOnlyAfterConfirmation: true,
        requiredFields: [...REQUIRED_SUPPORT_FIELDS],
        reason: supportRecommended
          ? "Customer asked for human confirmation or support-style compatibility help."
          : null,
      },
    },
  }
}
