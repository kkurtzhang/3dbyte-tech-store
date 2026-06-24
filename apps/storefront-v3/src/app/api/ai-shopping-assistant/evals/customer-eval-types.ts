export type CustomerAiEvalSuite = "smoke" | "release" | "extended"

export type CustomerAiEvalToolName =
  | "searchProducts"
  | "lookupOrder"
  | "getTracking"
  | "estimateShipping"
  | "createSupportTicket"

export type CustomerAiEvalTag =
  | "petg_outdoor"
  | "hardened_nozzle"
  | "rc_electronics"
  | "compatibility_missing_details"
  | "product_documents"
  | "support_handoff"
  | "follow_up"
  | "product_link_grounding"
  | "price_stock_safety_guardrails"
  | "comparison"
  | "material_selection"
  | "build_surface"
  | "drying_storage"
  | "shipping"
  | "order_readonly"
  | "prompt_injection"
  | "safety"

export type CustomerAiEvalAutomatedScoreName =
  | "product_link_correct"
  | "support_handoff_safe"
  | "tool_call_correct"
  | "order_privacy_safe"
  | "no_pii_leak"

export type CustomerAiEvalAutomatedCheck = {
  comment: string
  name: CustomerAiEvalAutomatedScoreName
  passed: boolean
}

export type CustomerAiEvalToolCall = {
  approvalId?: string
  errorText?: string
  input?: unknown
  output?: unknown
  state:
    | "input-start"
    | "input-available"
    | "input-error"
    | "approval-request"
    | "output-available"
    | "output-error"
    | "output-denied"
  toolCallId: string
  toolName: string
}

export type CustomerAiEvalCase = {
  checks?: {
    noPiiLeak?: boolean
    orderPrivacy?: {
      proof: "missing" | "provided"
      protectedTools: CustomerAiEvalToolName[]
      requiredTool?: CustomerAiEvalToolName
    }
    productLink?: {
      required: boolean
    }
    supportHandoff?: {
      allowTicketCreation: boolean
    }
    toolCall?: {
      forbidden?: CustomerAiEvalToolName[]
      oneOf?: CustomerAiEvalToolName[]
      required?: CustomerAiEvalToolName[]
    }
  }
  customerPrompt: string
  customerPrompts?: string[]
  expectedAnswer: {
    forbiddenPatterns?: Array<{
      label: string
      pattern: RegExp
    }>
    formatHints: string[]
    minimumCueMatches?: number
    mustIncludeOneOf: string[]
  }
  id: string
  suites: CustomerAiEvalSuite[]
  tags: CustomerAiEvalTag[]
}
