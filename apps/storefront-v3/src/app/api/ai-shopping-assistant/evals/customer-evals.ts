import { customerAiCommerceEvalCases } from "./customer-eval-commerce-cases"
import { customerAiProductEvalCases } from "./customer-eval-product-cases"
import { customerAiRcSupportEvalCases } from "./customer-eval-rc-support-cases"
import type {
  CustomerAiEvalCase,
  CustomerAiEvalSuite,
  CustomerAiEvalTag,
} from "./customer-eval-types"

export type {
  CustomerAiEvalCase,
  CustomerAiEvalSuite,
  CustomerAiEvalTag,
} from "./customer-eval-types"

export const CUSTOMER_AI_EVAL_REQUIRED_TAGS = [
  "petg_outdoor",
  "hardened_nozzle",
  "rc_electronics",
  "compatibility_missing_details",
  "product_documents",
  "support_handoff",
  "follow_up",
  "product_link_grounding",
  "price_stock_safety_guardrails",
  "comparison",
] satisfies CustomerAiEvalTag[]

export const customerAiEvalCases: CustomerAiEvalCase[] = [
  ...customerAiProductEvalCases,
  ...customerAiRcSupportEvalCases,
  ...customerAiCommerceEvalCases,
]

export function selectCustomerAiEvalCases({
  ids,
  limit,
  suite = "release",
}: {
  ids?: string[]
  limit?: number
  suite?: CustomerAiEvalSuite
} = {}) {
  const selectedCases = ids?.length
    ? customerAiEvalCases.filter((evalCase) => ids.includes(evalCase.id))
    : customerAiEvalCases.filter((evalCase) => evalCase.suites.includes(suite))

  return Number.isFinite(limit) && Number(limit) > 0
    ? selectedCases.slice(0, Number(limit))
    : selectedCases
}
