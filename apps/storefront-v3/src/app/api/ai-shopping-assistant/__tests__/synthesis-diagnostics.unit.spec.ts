/** @jest-environment node */
// Newly constructed synthetic candidates; none are recovered November 1 drafts.
import { createHash } from "node:crypto";
import observed from "../__fixtures__/observed-answer-repetition.json";
import { createKnowledgeExecution } from "../knowledge-execution";
import { synthesisEvidence } from "../synthesis-evidence";
import { assembleKnowledgeAnswer } from "../knowledge-grounding";
import {
  synthesizeKnowledgeAnswer,
  type SynthesisOutcome,
} from "../grounded-synthesis";
import {
  draftSchema,
  hardCheckDraft,
  diagnoseHardCheckDraft,
} from "../synthesis-contract";

const now = Date.parse(observed.provenance.observedAt);
const fact = (text: string, evidenceIds = ["f1"]) => ({
  kind: "fact" as const,
  text,
  evidenceIds,
  productKey: "p1" as const,
});
const valid = "{{product}} supports PETG on glass.";
async function setup() {
  const e = createKnowledgeExecution(
    async () => observed.cases[1].knowledge,
    () => now,
  );
  await e.execute({ query: "Magigoo Original" }, { toolCallId: "synthetic" });
  return e;
}
const cases = [
  ["supported", { segments: [fact(valid)] }, true, undefined],
  [
    "unknown reference",
    { segments: [fact(valid, ["f999"])] },
    false,
    "unknown_evidence_id",
  ],
  [
    "duplicate reference",
    { segments: [fact(valid, ["f1", "f1"])] },
    false,
    "duplicate_evidence_id",
  ],
  [
    "missing reference",
    { segments: [fact(valid, [])] },
    false,
    "fact_without_evidence",
  ],
  [
    "missing placeholder",
    { segments: [fact("Magigoo works on glass.")] },
    false,
    "missing_product_placeholder",
  ],
  [
    "null support",
    { segments: [fact(valid, ["f3"])] },
    false,
    "only_unknown_evidence",
  ],
  [
    "link",
    { segments: [fact("{{product}} https://example.invalid")] },
    false,
    "forbidden_markup_or_citation",
  ],
  [
    "bracket",
    { segments: [fact("{{product}} [f1]")] },
    false,
    "forbidden_markup_or_citation",
  ],
  [
    "other placeholder",
    { segments: [fact("{{product}} {{other}}")] },
    false,
    "forbidden_markup_or_citation",
  ],
  [
    "number",
    { segments: [fact("Apply 3 coats of {{product}}.")] },
    false,
    "unsupported_quantity",
  ],
  [
    "temperature",
    { segments: [fact("{{product}} operates at 500°C.")] },
    false,
    "thermal_or_electrical_advice",
  ],
  [
    "voltage",
    { segments: [fact("{{product}} uses volts.")] },
    false,
    "thermal_or_electrical_advice",
  ],
  [
    "material",
    { segments: [fact("{{product}} supports nylon on glass.")] },
    false,
    "unsupported_material_scope",
  ],
  [
    "surface",
    { segments: [fact("{{product}} supports PETG on PEI.")] },
    false,
    "unsupported_surface_scope",
  ],
  [
    "questions",
    { segments: [fact("{{product}} works? Which plate?")] },
    false,
    "question_limit",
  ],
  [
    "total length",
    {
      segments: Array.from({ length: 5 }, () =>
        fact("{{product}} " + "x".repeat(600)),
      ),
    },
    false,
    "answer_length_limit",
  ],
  [
    "safe clarification",
    {
      segments: [
        {
          ...fact("Which build plate are you using?", []),
          kind: "guidance" as const,
        },
      ],
    },
    true,
    undefined,
  ],
] as const;

it.each(cases)(
  "preserves the staging acceptance decision for synthetic %s",
  async (_label, candidate, accepted) => {
    const packet = synthesisEvidence(await setup(), now)!;
    const parsed = draftSchema.parse(candidate);
    expect(hardCheckDraft(parsed, packet)).toBe(accepted);
  },
);
it.each(cases)(
  "identifies synthetic %s without changing acceptance",
  async (_label, candidate, accepted, code) => {
    const packet = synthesisEvidence(await setup(), now)!;
    const diagnostic = diagnoseHardCheckDraft(
      draftSchema.parse(candidate),
      packet,
    );
    expect(diagnostic).toEqual(
      accepted ? { ok: true } : expect.objectContaining({ ok: false, code }),
    );
  },
);
it("reports the actual rejected segment, not its text or reference values", async () => {
  const packet = synthesisEvidence(await setup(), now)!;
  expect(
    diagnoseHardCheckDraft(
      draftSchema.parse({
        segments: [fact(valid), fact("{{product}} uses 27 coats.")],
      }),
      packet,
    ),
  ).toEqual({ ok: false, code: "unsupported_quantity", segmentIndex: 1 });
});
it("keeps fallback and call count unchanged while distinguishing schema and hard-rule failures", async () => {
  const execution = await setup();
  for (const [candidate, phase, code] of [
    [
      { segments: [{ ...fact(valid), productKey: "other" }] },
      "schema",
      "schema_invalid",
    ],
    [
      { segments: [fact("{{product}} uses 27 coats.")] },
      "hard",
      "unsupported_quantity",
    ],
  ] as const) {
    const raw = JSON.stringify(candidate);
    let outcome: SynthesisOutcome | undefined;
    const call = jest.fn(async () => ({ text: raw }));
    const answer = await synthesizeKnowledgeAnswer({
      execution,
      question: "Is Magigoo Original suitable for PETG on glass?",
      call,
      now: () => now,
      onOutcome: (o) => {
        outcome = o;
      },
    });
    expect(answer).toEqual({
      ...assembleKnowledgeAnswer(
        execution,
        "Is Magigoo Original suitable for PETG on glass?",
        now,
      ),
      origin: "validated_claim_composer",
    });
    expect(call).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({
      reason: "hard_check_failed",
      candidate: {
        sha256: createHash("sha256").update(raw).digest("hex"),
        utf8Bytes: Buffer.byteLength(raw),
      },
      failure: { phase, code },
    });
  }
});
it("uses safe bounded schema paths and never serializes attacker-controlled keys or values", async () => {
  const execution = await setup();
  const marker = "PRIVATE_CUSTOMER_MARKER";
  const raw = JSON.stringify({
    [marker]: marker,
    segments: [{ ...fact(valid), productKey: marker, [marker]: marker }],
  });
  let outcome: SynthesisOutcome | undefined;
  await synthesizeKnowledgeAnswer({
    execution,
    question: "Will Magigoo Original work on glass?",
    call: async () => ({ text: raw }),
    now: () => now,
    onOutcome: (o) => {
      outcome = o;
    },
  });
  expect(JSON.stringify(outcome)).not.toContain(marker);
  expect(outcome?.failure).toMatchObject({
    phase: "schema",
    code: "schema_invalid",
  });
  expect(outcome?.failure?.issues).toContainEqual(
    expect.objectContaining({ path: ["segments", 0, "productKey"] }),
  );
});
it("distinguishes invalid JSON and response bounds without changing call_failed behavior", async () => {
  for (const [raw, code] of [
    ["not JSON", "json_invalid"],
    ["x".repeat(12001), "response_limit"],
  ]) {
    let outcome: SynthesisOutcome | undefined;
    await synthesizeKnowledgeAnswer({
      execution: await setup(),
      question: "Can I use Magigoo Original on glass?",
      call: async () => ({ text: raw }),
      now: () => now,
      onOutcome: (o) => {
        outcome = o;
      },
    });
    expect(outcome).toMatchObject({
      reason: "call_failed",
      failure: { phase: "parse", code },
    });
  }
});

it("bounds diagnostic issue count/depth and replaces unknown schema paths", async () => {
  const { schemaFailure, synthesisDiagnosticMetadata } = await import(
    "../synthesis-diagnostics"
  );
  const failure = schemaFailure(
    Array.from({ length: 20 }, () => ({
      code: "invalid_type",
      path: ["segments", 1, "PRIVATE_CUSTOMER_MARKER", 999, "text"],
    })),
  );
  expect(failure.issues).toHaveLength(8);
  expect(failure.issues![0].path).toEqual(["segments", 1, "other", "other"]);
  expect(
    JSON.stringify(synthesisDiagnosticMetadata({ failure })),
  ).not.toContain("PRIVATE_CUSTOMER_MARKER");
  expect(synthesisDiagnosticMetadata()).toEqual({});
});
it("captures complete UTF-8 only within the immutable pilot byte limit", async () => {
  const { captureSyntheticPilotDraft, PILOT_DRAFT_CAPTURE_BYTES } =
    await import("../pilot-draft-capture");
  const exact = "🧪".repeat(PILOT_DRAFT_CAPTURE_BYTES / 4);
  expect(captureSyntheticPilotDraft(exact)).toMatchObject({
    text: exact,
    utf8Bytes: PILOT_DRAFT_CAPTURE_BYTES,
  });
  const oversized = captureSyntheticPilotDraft(exact + "!");
  expect(oversized).toMatchObject({
    omittedReason: "byte_limit",
    utf8Bytes: PILOT_DRAFT_CAPTURE_BYTES + 1,
  });
  expect(oversized).not.toHaveProperty("text");
});
