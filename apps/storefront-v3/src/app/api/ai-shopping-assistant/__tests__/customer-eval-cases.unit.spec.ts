import {
  customerAiEvalCases,
  selectCustomerAiEvalCases,
} from "../evals/customer-evals"
import { scoreCustomerEvalAnswer } from "../evals/customer-eval-runner"

describe("customer AI eval case selection", () => {
  it("keeps the default release suite manageable and the smoke suite small", () => {
    const smoke = selectCustomerAiEvalCases({ suite: "smoke" })
    const release = selectCustomerAiEvalCases({ suite: "release" })

    expect(smoke).toHaveLength(8)
    expect(release).toHaveLength(28)
    expect(release).toEqual(
      expect.arrayContaining(smoke.map((evalCase) => evalCase)),
    )
  })

  it("keeps the smoke suite broad enough for CI release gates", () => {
    const smokeCaseIds = selectCustomerAiEvalCases({ suite: "smoke" }).map(
      (evalCase) => evalCase.id,
    )

    expect(smokeCaseIds).toEqual(
      expect.arrayContaining([
        "exact-product-link",
        "support-ticket-no-confirmation",
        "order-lookup-missing-email",
      ]),
    )
  })

  it("supports an extended suite without making it the default", () => {
    const release = selectCustomerAiEvalCases({ suite: "release" })
    const extended = selectCustomerAiEvalCases({ suite: "extended" })

    expect(extended.length).toBeGreaterThan(release.length)
    expect(extended).toHaveLength(customerAiEvalCases.length)
  })

  it("filters explicit case ids before applying a limit", () => {
    expect(
      selectCustomerAiEvalCases({
        ids: ["exact-product-link", "order-lookup-missing-email"],
        limit: 1,
        suite: "extended",
      }).map((evalCase) => evalCase.id),
    ).toEqual(["exact-product-link"])
  })

  it("includes a true multi-turn release case", () => {
    expect(
      selectCustomerAiEvalCases({ suite: "release" }).some(
        (evalCase) => (evalCase.customerPrompts?.length ?? 0) > 1,
      ),
    ).toBe(true)
  })

  it("requires PII leak checks for synthetic customer identifiers", () => {
    const casesWithSyntheticIdentifiers = customerAiEvalCases.filter(
      (evalCase) =>
        /(?:example\.com|(?:ORDER|CASE|TICKET)-[A-Z0-9-]+)/i.test(
          [
            evalCase.customerPrompt,
            ...(evalCase.customerPrompts ?? []),
          ].join("\n"),
        ),
    )

    expect(casesWithSyntheticIdentifiers.length).toBeGreaterThan(0)

    for (const evalCase of casesWithSyntheticIdentifiers) {
      expect(evalCase.checks?.noPiiLeak).toBe(true)
    }
  })

  it("accepts safe smoke replies that ask for proof before order or ticket actions", () => {
    const casesById = new Map(
      selectCustomerAiEvalCases({ suite: "smoke" }).map((evalCase) => [
        evalCase.id,
        evalCase,
      ]),
    )

    expect(
      scoreCustomerEvalAnswer(
        casesById.get("order-lookup-missing-email")!,
        "I'd be happy to help you track your order. For security reasons, please provide the email address associated with the order so I can look it up.",
      ).passed,
    ).toBe(true)
    expect(
      scoreCustomerEvalAnswer(
        casesById.get("support-ticket-no-confirmation")!,
        "I can help with a support ticket. First, I need to verify ORDER-123 and get the email address associated with the order.",
      ).passed,
    ).toBe(true)
  })
})
