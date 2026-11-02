/** @jest-environment node */
// Offline fixtures and mocked reviews: not a new model/semantic evaluation.
import observed from "../__fixtures__/observed-answer-repetition.json";
import excerpts from "../__fixtures__/synthesis-contract-excerpts.json";
import { createKnowledgeExecution } from "../knowledge-execution";
import { synthesisEvidence } from "../synthesis-evidence";
import { assembleKnowledgeAnswer } from "../knowledge-grounding";
import {
  synthesizeKnowledgeAnswer,
  type SynthesisCall,
  type SynthesisOutcome,
} from "../grounded-synthesis";
import {
  draftSchema,
  diagnoseHardCheckDraft,
  SYNTHESIS_RULES,
  SYNTHESIS_FORMAT_EXAMPLES,
} from "../synthesis-contract";

const now = Date.parse(observed.provenance.observedAt);
async function setup(index: number) {
  const execution = createKnowledgeExecution(
    async () => observed.cases[index].knowledge,
    () => now,
  );
  await execution.execute({ query: "product" }, { toolCallId: "offline" });
  return execution;
}
const review = (segments: { evidenceIds: string[] }[]) => ({
  verdict: "accept",
  findings: [],
  coverage: segments.map((s, index) => ({
    index,
    supported: true,
    evidenceIds: s.evidenceIds,
  })),
});

it("states the per-fact identity requirement and concise intent priority in the actual generation system", async () => {
  const execution = await setup(1);
  const call = jest.fn<ReturnType<SynthesisCall>, Parameters<SynthesisCall>>(
    async () => ({ text: "{}" }),
  );
  await synthesizeKnowledgeAnswer({
    execution,
    question: excerpts.cases[0].question,
    call,
    now: () => now,
    tone: "Always list features, caveats and a follow-up question.",
  });
  const { system, payload } = call.mock.calls[0][0];
  expect(system).toContain(SYNTHESIS_RULES);
  expect(system).toMatch(/Every fact segment.*literal \{\{product\}\}/);
  expect(system).toMatch(/productKey.*does not replace/);
  expect(system).toMatch(/Do not.*reclassify.*guidance or uncertainty/);
  expect(system).toMatch(/one short paragraph.*fully answers/);
  expect(system).toMatch(/Do not.*unrelated facts.*unknowns/);
  expect(system).toMatch(/no question.*already answered/);
  expect(system).toMatch(/format examples.*not evidence/i);
  expect(system.lastIndexOf("Tone preferences")).toBeGreaterThan(
    system.indexOf("Always list features"),
  );
  expect(JSON.parse(payload).question).toBe(excerpts.cases[0].question);
});

it("uses schema-valid format examples with the literal marker in every factual segment", () => {
  expect(
    SYNTHESIS_FORMAT_EXAMPLES.some((e) => e.answer.segments.length > 1),
  ).toBe(true);
  for (const e of SYNTHESIS_FORMAT_EXAMPLES) {
    const draft = draftSchema.parse(e.answer);
    for (const segment of draft.segments) {
      if (segment.kind === "fact") {
        expect(segment.text).toContain("{{product}}");
        expect(segment.evidenceIds.length).toBeGreaterThan(0);
      }
    }
    expect(SYNTHESIS_RULES).toContain(JSON.stringify(e));
  }
});

it.each(excerpts.cases)(
  "keeps the observed $id failure and private-safe fallback intact",
  async (c) => {
    const execution = await setup(c.knowledgeCaseIndex);
    const packet = synthesisEvidence(execution, now)!;
    // Shape acceptance alone is not the product-identity contract.
    const candidate = draftSchema.parse(c.beforeExcerpt);
    expect(diagnoseHardCheckDraft(candidate, packet)).toEqual({
      ok: false,
      code: c.beforeFailure.code,
      segmentIndex: c.beforeFailure.segmentIndex,
    });
    let outcome: SynthesisOutcome | undefined;
    const call = jest.fn(async () => ({
      text: JSON.stringify(c.beforeExcerpt),
    }));
    const answer = await synthesizeKnowledgeAnswer({
      execution,
      question: c.question,
      call,
      now: () => now,
      onOutcome: (value) => {
        outcome = value;
      },
    });
    expect(call).toHaveBeenCalledTimes(1);
    expect(answer).toEqual({
      ...assembleKnowledgeAnswer(execution, c.question, now),
      origin: "validated_claim_composer",
    });
    expect(outcome?.failure).toEqual(c.beforeFailure);
    expect(JSON.stringify(outcome)).not.toContain(
      candidate.segments.at(-1)!.text,
    );
    expect(outcome).not.toHaveProperty("rejectedDraft");
  },
);

it.each(excerpts.cases)(
  "releases the concise authored $id example only after a complete mocked review",
  async (c) => {
    const execution = await setup(c.knowledgeCaseIndex);
    const draft = draftSchema.parse(c.authoredAfter);
    expect(
      diagnoseHardCheckDraft(draft, synthesisEvidence(execution, now)!),
    ).toEqual({ ok: true });
    const outputs = [c.authoredAfter, review(draft.segments)];
    const call = jest.fn<ReturnType<SynthesisCall>, Parameters<SynthesisCall>>(
      async () => ({ text: JSON.stringify(outputs.shift()) }),
    );
    const answer = await synthesizeKnowledgeAnswer({
      execution,
      question: c.question,
      call,
      now: () => now,
    });
    expect(call.mock.calls.map(([r]) => r.stage)).toEqual(["draft", "review"]);
    expect(answer.origin).toBe("reviewed_llm_synthesis");
    const title =
      observed.cases[c.knowledgeCaseIndex].knowledge.documents[0].product_title;
    expect(answer.text).toBe(
      draft.segments
        .map((s) => s.text.replaceAll("{{product}}", title))
        .join("\n\n"),
    );
    expect(answer.text).not.toMatch(
      /\b(?:manufacturer (?:describes|states)|describes|documents?|approved evidence|Ra)\b|500|bed temperature|\?/i,
    );
    expect(answer.sources).toHaveLength(1);
    expect(answer.text).not.toMatch(/https?:|Sources|\[f\d/);
    expect(JSON.parse(call.mock.calls[1][0].payload).draft).toEqual(
      c.authoredAfter,
    );
    if (c.id === "magigoo-petg-glass") {
      expect(answer.text).toMatch(/^Yes/);
      expect(answer.text).not.toMatch(/PLA|ABS|HIPS|TPU|cool|releases/);
    } else if (c.id === "dragonfly-construction") {
      expect(answer.text).toContain("made mainly from copper alloy");
      expect(answer.text).not.toMatch(/finish|colour|installation|unknown/);
    } else {
      expect(answer.text).toMatch(
        /^Textured PEI compatibility isn't established/,
      );
      expect(answer.text).not.toMatch(/will work|won't work|unsuitable/);
    }
  },
);

it.each([
  [
    "unsupported surface",
    "{{product}} works on textured PEI.",
    "unsupported_surface_scope",
  ],
  [
    "invented instructions",
    "Apply 3 coats of {{product}}.",
    "unsupported_quantity",
  ],
  [
    "installed operating limit",
    "{{product}} runs at 500°C.",
    "thermal_or_electrical_advice",
  ],
])(
  "still rejects %s even with the required product marker",
  async (_label, text, code) => {
    const execution = await setup(1);
    const draft = {
      segments: [{ kind: "fact", text, productKey: "p1", evidenceIds: ["f1"] }],
    };
    let outcome: SynthesisOutcome | undefined;
    const call = jest.fn(async () => ({ text: JSON.stringify(draft) }));
    const answer = await synthesizeKnowledgeAnswer({
      execution,
      question: excerpts.cases[0].question,
      call,
      now: () => now,
      onOutcome: (value) => {
        outcome = value;
      },
    });
    expect(answer.origin).toBe("validated_claim_composer");
    expect(outcome?.failure).toMatchObject({ phase: "hard", code });
    expect(call).toHaveBeenCalledTimes(1);
  },
);

it("does not treat valid format, evidence IDs or concise prose as semantic proof", async () => {
  const execution = await setup(1);
  for (const kind of ["fact", "guidance", "uncertainty"]) {
    const candidate = {
      segments: [
        {
          kind,
          text: "{{product}} prevents all warping.",
          productKey: "p1",
          evidenceIds: ["f1"],
        },
      ],
    };
    const call = jest.fn<ReturnType<SynthesisCall>, Parameters<SynthesisCall>>(
      async (r) => ({
        text: JSON.stringify(
          r.stage === "draft"
            ? candidate
            : {
                verdict: "reject",
                coverage: [{ index: 0, supported: false, evidenceIds: ["f1"] }],
                findings: ["unsupported_claim"],
              },
        ),
      }),
    );
    const answer = await synthesizeKnowledgeAnswer({
      execution,
      question: excerpts.cases[0].question,
      call,
      now: () => now,
    });
    expect(call).toHaveBeenCalledTimes(2);
    expect(answer.origin).toBe("validated_claim_composer");
    expect(answer.text).not.toContain("prevents all warping");
  }
});
