import {
  CUSTOMER_AI_EVAL_REQUIRED_TAGS,
  customerAiEvalCases,
} from "../evals/customer-evals"

const INTERNAL_QA_PHRASES = [
  /guardrail/i,
  /expected behavior/i,
  /support ticket option/i,
  /if human help is needed/i,
  /do not create/i,
  /don't create/i,
  /for testing/i,
  /QA/i,
]

describe("customer AI eval prompts", () => {
  it("uses natural customer language instead of internal QA wording", () => {
    expect(customerAiEvalCases.length).toBeGreaterThanOrEqual(12)

    for (const evalCase of customerAiEvalCases) {
      expect(evalCase.customerPrompt).toEqual(expect.any(String))
      expect(evalCase.customerPrompt.length).toBeGreaterThanOrEqual(20)
      expect(evalCase.customerPrompt).not.toMatch(/if .* then/i)

      for (const internalPhrase of INTERNAL_QA_PHRASES) {
        expect(evalCase.customerPrompt).not.toMatch(internalPhrase)
      }
    }
  })

  it("covers the Phase 2B assistant capability baseline", () => {
    const coveredTags = new Set(
      customerAiEvalCases.flatMap((evalCase) => evalCase.tags)
    )

    for (const requiredTag of CUSTOMER_AI_EVAL_REQUIRED_TAGS) {
      expect(coveredTags).toContain(requiredTag)
    }
  })

  it("defines answer-quality and forbidden-behavior checks for every case", () => {
    for (const evalCase of customerAiEvalCases) {
      expect(evalCase.expectedAnswer.mustIncludeOneOf.length).toBeGreaterThan(0)
      expect(evalCase.expectedAnswer.mustAvoid.length).toBeGreaterThan(0)
      expect(evalCase.expectedAnswer.formatHints.length).toBeGreaterThan(0)

      expect(evalCase.expectedAnswer.mustAvoid).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/invent|claim|create|change/i),
        ])
      )
    }
  })
})
