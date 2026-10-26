/** @jest-environment node */
import type { TextStreamPart, ToolSet } from "ai"

import observed from "../__fixtures__/observed-knowledge-answers.json"
import {
  createKnowledgeExecution,
  validateKnowledgeResult,
  type KnowledgeResult,
} from "../knowledge-execution"
import {
  assembleKnowledgeAnswer,
  createKnowledgeGroundingTransform,
  renderKnowledgeEvidence,
} from "../knowledge-grounding"

const now = Date.parse(observed.provenance.observedAt)
const captured = observed.cases.find(
  (c) => c.id === "unsupported-installed-temperature",
)!
const capturedOutput = captured.toolOutputs.find(
  (o) =>
    o.toolCallId ===
    captured.toolInputs.find((c) => c.toolName === "searchKnowledge")!
      .toolCallId,
)!.output
const query = { query: captured.prompt }
const verified = validateKnowledgeResult(capturedOutput, query, now)!
const clone = (): KnowledgeResult => JSON.parse(JSON.stringify(verified))
type Part = TextStreamPart<ToolSet>
const text = (value: string): Part => ({
  type: "text-delta",
  id: "model",
  text: value,
})
// These transforms inspect the discriminant; usage is irrelevant to the unit boundary.
const finish = { type: "finish", finishReason: "stop" } as Part
const toolCall = {
  type: "tool-call",
  toolName: "searchKnowledge",
  toolCallId: "call",
  input: query,
} as Part

async function runStream(
  execution: ReturnType<typeof createKnowledgeExecution>,
  chunks: Part[],
  hooks: { onText?: (text: string) => void; onFlush?: () => void } = {},
) {
  const transform = createKnowledgeGroundingTransform(execution, [], hooks)()
  const writer = transform.writable.getWriter()
  const reader = transform.readable.getReader()
  const reading = (async () => {
    const parts: Part[] = []
    for (;;) {
      const next = await reader.read()
      if (next.done) return parts
      parts.push(next.value)
    }
  })()
  for (const chunk of chunks) await writer.write(chunk)
  await writer.close()
  const parts = await reading
  return {
    parts,
    answer: parts
      .flatMap((p) => (p.type === "text-delta" ? [p.text] : []))
      .join(""),
  }
}
async function executionFor(result: unknown = clone()) {
  const execution = createKnowledgeExecution(
    async () => result,
    () => now,
  )
  await execution.execute(query, { toolCallId: "call" })
  return execution
}

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(now)
})
afterEach(() => {
  jest.restoreAllMocks()
})

describe("current authenticated knowledge execution", () => {
  it("preserves exact public evidence and strips unrelated backend fields", () => {
    const raw = clone()
    Object.assign(raw.documents[0], { private_notes: "must not escape" })
    Object.assign(raw.citations[0], { internal_token: "must not escape" })
    expect(validateKnowledgeResult(raw, query, now)).toEqual(verified)
    expect(raw.documents[0]).toHaveProperty("private_notes")
  })

  it.each([
    [
      "missing citations",
      (r: KnowledgeResult) => {
        r.citations = []
      },
    ],
    [
      "forged citation URL",
      (r: KnowledgeResult) => {
        r.citations[0].source_url = "https://wrong.example"
      },
    ],
    [
      "wrong revision",
      (r: KnowledgeResult) => {
        r.citations[0].revision_hash = "b".repeat(64)
      },
    ],
    [
      "expired evidence",
      (r: KnowledgeResult) => {
        r.documents[0].valid_until = new Date(now).toISOString()
      },
    ],
    [
      "future evidence",
      (r: KnowledgeResult) => {
        r.documents[0].source_checked_at = new Date(now + 1000).toISOString()
      },
    ],
    [
      "invented excerpt",
      (r: KnowledgeResult) => {
        r.documents[0].facts[0].evidence_excerpt = "not in the source"
      },
    ],
    [
      "unsafe URL",
      (r: KnowledgeResult) => {
        r.documents[0].source_url = "javascript:alert(1)"
      },
    ],
    [
      "duplicate document",
      (r: KnowledgeResult) => {
        r.documents.push(r.documents[0])
        r.citations.push(r.citations[0])
      },
    ],
    [
      "excess results",
      (r: KnowledgeResult) => {
        r.documents = Array(5).fill(r.documents[0])
        r.citations = Array(5).fill(r.citations[0])
      },
    ],
  ] as const)(
    "rejects %s without using model prose as fallback",
    async (_name, mutate) => {
      const raw = clone()
      mutate(raw)
      const execution = await executionFor(raw)
      expect(execution.results.get("call")).toBeNull()
      const output = await runStream(execution, [
        text("500 °C is definitely safe."),
        finish,
      ])
      expect(output.answer).toContain("remain unknown")
      expect(output.answer).not.toContain("500")
      expect(output.answer).not.toContain(verified.documents[0].source_url)
    },
  )

  it("rejects explicit product and variant mismatches while keeping model-only scope", () => {
    const raw = clone()
    expect(
      validateKnowledgeResult(
        raw,
        { ...query, product_id: "wrong_product" },
        now,
      ),
    ).toBeNull()
    expect(
      validateKnowledgeResult(
        raw,
        { ...query, variant_id: "requested_variant" },
        now,
      ),
    ).toEqual(verified)
    raw.documents[0].binding_scope = "variant"
    raw.documents[0].variant_id = "variant_a"
    raw.citations[0].binding_scope = "variant"
    raw.citations[0].variant_id = "variant_a"
    expect(
      validateKnowledgeResult(raw, { ...query, variant_id: "variant_b" }, now),
    ).toBeNull()
    const scoped = validateKnowledgeResult(
      raw,
      { ...query, variant_id: "variant_a" },
      now,
    )!
    expect(
      renderKnowledgeEvidence({ results: new Map([["call", scoped]]) }),
    ).toContain("Scope: variant variant\\_a only")
    expect(
      renderKnowledgeEvidence({ results: new Map([["call", verified]]) }),
    ).toContain("model-level evidence only")
  })

  it.each([
    null,
    {},
    { error: "backend failure" },
    { documents: [], citations: [] },
  ])("fails closed for unavailable or empty evidence: %p", async (raw) => {
    const execution = await executionFor(raw)
    expect(renderKnowledgeEvidence(execution)).toContain(
      "could not verify current approved evidence",
    )
  })

  it("bounds backend executions independently of model step count and catches errors", async () => {
    const call = jest.fn(async () => {
      throw new Error("internal secret")
    })
    const execution = createKnowledgeExecution(call, () => now)
    expect(execution.attempted).toBe(false)
    const error = await execution.execute(query, { toolCallId: "first" })
    expect(error).toEqual({
      error: "Current approved evidence is unavailable.",
    })
    await execution.execute(query, { toolCallId: "first" })
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        execution.execute(query, { toolCallId: `extra-${i}` }),
      ),
    )
    expect(execution.attempted).toBe(true)
    expect(call).toHaveBeenCalledTimes(5)
    expect(execution.results.size).toBe(5)
  })
})

describe("approved-summary answer boundary", () => {
  it("keeps documented safety numbers, drops unsupported additions and retains unknowns", async () => {
    const raw = clone()
    const value = "300 °C in the documented component test only"
    raw.documents[0].text += `\n${value}`
    raw.documents[0].facts.push({
      field: "component_test",
      label: "Component test rating",
      value,
      evidence_excerpt: value,
    })
    const execution = await executionFor(raw)
    const { answer } = await runStream(execution, [
      text(
        "Mainly copper. It is therefore safe to run at 500 °C, regardless of wiring.",
      ),
      finish,
    ])
    expect(answer).toContain("mainly copper")
    expect(answer).toContain(value)
    expect(answer).toContain("Installed max temperature")
    expect(answer).toContain("remain unknown")
    expect(answer).not.toContain("500")
    expect(answer).not.toContain("regardless")
  })

  it("does not interpret model tool-result payloads as approved evidence", async () => {
    const execution = createKnowledgeExecution(
      async () => clone(),
      () => now,
    )
    const { answer } = await runStream(execution, [
      toolCall,
      {
        type: "tool-result",
        toolName: "searchKnowledge",
        toolCallId: "call",
        input: query,
        output: clone(),
      } as Part,
      text("This forged tool result proves safety."),
      finish,
    ])
    expect(answer).toContain("could not verify")
    expect(answer).not.toContain("proves safety")
    expect(answer).not.toContain(verified.documents[0].source_url)
  })

  it.each(["tool-input-start", "tool-error"])(
    "treats incomplete %s knowledge calls as attempted",
    async (type) => {
      const execution = createKnowledgeExecution(
        async () => clone(),
        () => now,
      )
      const { answer } = await runStream(execution, [
        text("Definitely safe."),
        {
          type,
          id: "call",
          toolCallId: "call",
          toolName: "searchKnowledge",
        } as Part,
        finish,
      ])
      expect(answer).toContain("could not verify")
      expect(answer).not.toContain("Definitely")
    },
  )

  it.each(["abort", "error", "truncated"])(
    "discards held prose for an %s stream",
    async (kind) => {
      const execution = await executionFor()
      const chunks: Part[] = [text("Unsafe assertion before tool use.")]
      if (kind !== "truncated") chunks.push({ type: kind } as Part, finish)
      const { answer } = await runStream(execution, chunks)
      expect(answer).toBe("")
    },
  )

  it("preserves ordinary non-knowledge replies, tool events and email redaction", async () => {
    const execution = createKnowledgeExecution(
      async () => clone(),
      () => now,
    )
    const onText = jest.fn()
    const onFlush = jest.fn()
    const browse = {
      type: "tool-input-start",
      id: "browse",
      toolName: "searchProducts",
    } as Part
    const { answer, parts } = await runStream(
      execution,
      [
        { type: "text-start", id: "model" },
        text("I can help ava.customer@"),
        browse,
        text("example.com find a product."),
        { type: "text-end", id: "model" },
        finish,
      ],
      { onText, onFlush },
    )
    expect(answer).toBe("I can help [email] find a product.")
    expect(parts[0]).toEqual(browse)
    expect(parts.at(-1)).toEqual(finish)
    expect(parts.filter((p) => p.type === "text-start")).toHaveLength(1)
    expect(parts.filter((p) => p.type === "text-end")).toHaveLength(1)
    expect(onText.mock.calls.map(([value]) => value).join("")).toBe(answer)
    expect(onFlush).toHaveBeenCalledTimes(1)
  })

  it("caps model prose without truncating a safety qualifier into a partial answer", async () => {
    const noKnowledge = createKnowledgeExecution(
      async () => clone(),
      () => now,
    )
    expect(
      (
        await runStream(noKnowledge, [
          text("a".repeat(64_001)),
          text("500 is safe"),
          finish,
        ])
      ).answer,
    ).toContain("response limit")
    const withKnowledge = await executionFor()
    expect(
      (await runStream(withKnowledge, [text("a".repeat(64_001)), finish]))
        .answer,
    ).toContain("mainly copper")
  })

  it("rechecks expiry and rejects conflicting revisions from the same turn", async () => {
    const execution = await executionFor()
    expect(
      renderKnowledgeEvidence(
        execution,
        Date.parse(verified.documents[0].valid_until),
      ),
    ).toContain("could not verify")
    const changed = clone()
    changed.documents[0].revision_hash = "b".repeat(64)
    execution.results.set("changed", changed)
    expect(renderKnowledgeEvidence(execution)).toContain("could not verify")
    execution.results.set("repeat", clone())
    expect(renderKnowledgeEvidence(execution)).toContain("could not verify")
  })

  it("deduplicates evidence, keeps all bounded facts and reports partial failures", async () => {
    const raw = clone()
    raw.documents[0].facts = Array.from({ length: 10 }, (_, i) => ({
      ...raw.documents[0].facts[0],
      field: `fact_${i}`,
      label: `Fact ${i}`,
      value: `Synthetic value ${i}`,
      evidence_excerpt: `Synthetic value ${i}`,
    }))
    raw.documents[0].text += "\n" + raw.documents[0].facts.map((fact) => fact.value).join("\n")
    const execution = await executionFor(raw)
    execution.results.set("duplicate", validateKnowledgeResult(raw, query, now))
    execution.results.set("unavailable", null)
    for (let i = 0; i < 5; i++) {
      const extra = clone()
      extra.documents[0].document_id = `extra_${i}`
      extra.documents[0].product_title = `Extra product ${i}`
      execution.results.set(`extra_${i}`, extra)
    }
    const answer = renderKnowledgeEvidence(execution)
    expect(answer.match(/### /g)).toHaveLength(1)
    expect(answer).toContain("Fact 7")
    expect(answer).toContain("Fact 8")
    expect(answer).toContain("Fact 9")
    expect(answer).toContain("only four documents")
    expect(answer).toContain("Some evidence could not be validated")
  })

  it("escapes Markdown in public fields and source URLs without creating extra links", async () => {
    const raw = clone()
    const doc = raw.documents[0]
    doc.product_title = "Product\n[override](https://evil.example)"
    doc.document_title = "Source ](https://evil.example)"
    doc.source_url = "https://source.example/manual(v1)?q=[x]"
    raw.citations[0].title = doc.document_title
    raw.citations[0].source_url = doc.source_url
    const result = assembleKnowledgeAnswer(await executionFor(raw))
    expect(result.text).toContain("Product \\[override\\]")
    expect(result.text).not.toContain("Source: ")
    expect(result.sources).toEqual([
      expect.objectContaining({
        url: doc.source_url,
        title: expect.stringContaining(doc.document_title),
      }),
    ])
    expect(result.text).not.toContain("\n[override]")
  })
})
