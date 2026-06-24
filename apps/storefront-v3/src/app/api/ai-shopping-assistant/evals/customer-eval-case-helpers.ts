import type {
  CustomerAiEvalCase,
  CustomerAiEvalSuite,
} from "./customer-eval-types"

export const smokeSuites: CustomerAiEvalSuite[] = [
  "smoke",
  "release",
  "extended",
]
export const releaseSuites: CustomerAiEvalSuite[] = ["release", "extended"]
export const extendedSuites: CustomerAiEvalSuite[] = ["extended"]

export const standardFormatHints = [
  "Start with a short recommendation.",
  "Use grounded product facts and mention uncertainty when details are missing.",
]

export const followUpFormatHints = [
  ...standardFormatHints,
  "End with one focused next question when more information is needed.",
]

export function defineCustomerAiEvalCase(evalCase: CustomerAiEvalCase) {
  return evalCase
}
