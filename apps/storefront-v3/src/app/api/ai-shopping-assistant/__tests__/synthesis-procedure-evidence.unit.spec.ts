/** @jest-environment node */
// Historical synthetic observations and offline mocks, never new live evidence.
import observed from "../__fixtures__/observed-answer-repetition.json";
import failure from "../__fixtures__/observed-unsupported-procedure.json";
import { createKnowledgeExecution } from "../knowledge-execution";
import {
  synthesizeKnowledgeAnswer,
  type SynthesisCall,
} from "../grounded-synthesis";
import { draftSchema, diagnoseHardCheckDraft } from "../synthesis-contract";
import { synthesisEvidence } from "../synthesis-evidence";
import {
  SYNTHESIS_SAFE_NEXT_STEPS,
  requiresProcedureFallback,
} from "../synthesis-procedures";
const now = Date.parse(observed.provenance.observedAt);
async function setup(data = observed.cases[1].knowledge) {
  data.citations = data.documents.map((d) => ({
    document_id: d.document_id,
    product_id: d.product_id,
    binding_scope: d.binding_scope,
    variant_id: d.variant_id,
    title: d.document_title,
    source_url: d.source_url,
    source_sha256: d.source_sha256,
    source_version: d.source_version,
    source_checked_at: d.source_checked_at,
    revision_hash: d.revision_hash,
    valid_until: d.valid_until,
  }));
  const execution = createKnowledgeExecution(
    async () => data,
    () => now,
  );
  await execution.execute(
    { query: "Magigoo Original" },
    { toolCallId: "offline" },
  );
  return execution;
}
const candidate = (text: string, kind = "guidance") => ({
  segments: [
    {
      kind,
      text,
      productKey: "p1",
      evidenceIds: kind === "guidance" ? [] : ["f1"],
    },
  ],
});
const accept = (evidenceIds: string[]) => ({
  verdict: "accept",
  findings: [],
  coverage: [{ index: 0, supported: true, evidenceIds }],
});
it("blocks the actual accepted PEI advice before a reviewer can accept it again", async () => {
  const execution = await setup();
  const call = jest.fn<ReturnType<SynthesisCall>, Parameters<SynthesisCall>>(
    async (r) => ({
      text: JSON.stringify(
        r.stage === "draft"
          ? candidate(failure.unsupportedParagraph)
          : accept([]),
      ),
    }),
  );
  const answer = await synthesizeKnowledgeAnswer({
    execution,
    question: failure.question,
    call,
    now: () => now,
  });
  expect(answer.origin).toBe("validated_claim_composer");
  expect(answer.text).not.toMatch(/inconspicuous|test a small/);
  expect(answer.text).toMatch(/compatibility.*textured PEI/);
  expect(answer.text).toContain("manufacturers' compatibility guidance");
  expect(call).not.toHaveBeenCalled();
});
it.each(["fact", "guidance", "uncertainty"])(
  "rejects procedural paraphrases even labelled %s",
  async (kind) => {
    const packet = synthesisEvidence(await setup(), now)!;
    for (const text of [
      "Try {{product}} on a hidden corner first.",
      "Use two light layers of {{product}}.",
      "{{product}} needs a small dose in a discreet spot.",
      "{{product}} can be applied to a discreet patch.",
      "A preliminary spot check with {{product}} is harmless.",
      "Put a dab of {{product}} near the edge.",
      "For {{product}}, a trial application is low risk.",
    ]) {
      expect(
        diagnoseHardCheckDraft(
          draftSchema.parse(candidate(text, kind)),
          packet,
        ),
      ).toMatchObject({
        ok: false,
        code: "procedure_without_approved_instructions",
      });
    }
  },
);

const instruction =
  "For PETG on glass only: Apply one thin layer and allow it to dry before printing.";
// Completely synthetic approved DTO for boundary tests, not Magigoo instructions.
function instructionFixture() {
  const data = structuredClone(observed.cases[1].knowledge);
  const d = data.documents[0];
  Object.assign(d, {
    document_id: "synthetic-instruction-doc",
    source_sha256: "a".repeat(64),
    revision_hash: "b".repeat(64),
    source_version: "synthetic-offline-only",
    source_checked_at: new Date(now - 1000).toISOString(),
    valid_until: new Date(now + 3600000).toISOString(),
    product_id: "synthetic-adhesive",
    product_handle: "example-adhesive",
    product_title: "Example Adhesive",
    source_url: "https://example.com/adhesive",
    document_title: "Synthetic instruction test",
    text:
      "Example describes Adhesive as designed and tested on glass build plates for PETG.\n" +
      instruction,
  });
  d.facts = [
    {
      field: "material_scope",
      label: "Synthetic material scope",
      value:
        "Example describes Adhesive as designed and tested on glass build plates for PETG.",
      evidence_excerpt: "PETG",
    },
    {
      field: "application_instructions",
      label: "Synthetic application instructions",
      value: instruction,
      evidence_excerpt: instruction,
    },
  ];
  return data;
}
const question = "How do I apply Example Adhesive for PETG on glass?";
function mockAnswer(draft: unknown, ids = ["f1"]) {
  return jest.fn<ReturnType<SynthesisCall>, Parameters<SynthesisCall>>(
    async (r) => ({
      text: JSON.stringify(r.stage === "draft" ? draft : accept(ids)),
    }),
  );
}
it("releases a complete scoped approved instruction only after mocked review and preserves exact qualifiers/sources", async () => {
  const execution = await setup(instructionFixture());
  const text = "{{product}}: " + instruction;
  const call = mockAnswer(
    {
      segments: [{ kind: "fact", text, productKey: "p1", evidenceIds: ["f2"] }],
    },
    ["f2"],
  );
  const result = await synthesizeKnowledgeAnswer({
    execution,
    question,
    call,
    now: () => now,
  });
  expect(result.origin).toBe("reviewed_llm_synthesis");
  expect(result.text).toBe("Example Adhesive: " + instruction);
  expect(call).toHaveBeenCalledTimes(2);
  expect(result.sources).toHaveLength(1);
  expect(result.sources[0].url).toBe("https://example.com/adhesive");
  expect(result.text).not.toMatch(/https:|Sources|\[f2/);
});
it.each([
  "How do I apply Example Adhesive for PETG on textured PEI?",
  "How do I apply Example Adhesive for TPU on glass?",
  "How do I apply Example Adhesive?",
  "How do I apply Example Adhesive for PETG on coated glass?",
])(
  "does not transfer approved instructions to an unverified scope: %s",
  async (question) => {
    const execution = await setup(instructionFixture());
    const call = mockAnswer(candidate("{{product}}: " + instruction, "fact"));
    await synthesizeKnowledgeAnswer({
      execution,
      question,
      call,
      now: () => now,
    });
    expect(call).not.toHaveBeenCalled();
  },
);
it("does not volunteer an approved procedure for an ordinary compatibility question", async () => {
  const execution = await setup(instructionFixture());
  const packet = synthesisEvidence(execution, now)!;
  const draft = draftSchema.parse({
    segments: [
      {
        kind: "fact",
        text: "{{product}}: " + instruction,
        productKey: "p1",
        evidenceIds: ["f2"],
      },
    ],
  });
  expect(
    diagnoseHardCheckDraft(draft, packet, {
      question: "Is Example Adhesive suitable for PETG on glass?",
    }),
  ).toMatchObject({ ok: false, code: "instruction_scope_unverified" });
});
it.each(["fact", "guidance", "uncertainty"])(
  "does not let %s relabelling or extra prose change an instruction",
  async (kind) => {
    const packet = synthesisEvidence(await setup(instructionFixture()), now)!;
    const draft = draftSchema.parse({
      segments: [
        {
          kind,
          text: "{{product}}: " + instruction + " This is harmless.",
          productKey: "p1",
          evidenceIds: ["f2"],
        },
      ],
    });
    expect(diagnoseHardCheckDraft(draft, packet, { question })).toMatchObject({
      ok: false,
      code: "instruction_contract_mismatch",
    });
  },
);
it.each(["material_scope", "marketing_test", "null", "body_only", "malformed"])(
  "does not turn %s into approved instructions",
  async (type) => {
    const data = instructionFixture();
    if (type === "null") data.documents[0].facts[1].value = null;
    else if (type === "body_only") data.documents[0].facts.pop();
    else if (type === "malformed")
      data.documents[0].facts[1].value = "Use it on any surface.";
    else data.documents[0].facts[1].field = type;
    const execution = await setup(data);
    const call = mockAnswer(candidate("Apply {{product}}.", "fact"));
    const answer = await synthesizeKnowledgeAnswer({
      execution,
      question,
      call,
      now: () => now,
    });
    expect(answer.origin).toBe("validated_claim_composer");
    expect(call).not.toHaveBeenCalled();
  },
);
it("keeps expired, conflicting and mixed-identity instruction packets ineligible", async () => {
  for (const type of ["expired", "conflict", "variant"]) {
    const data = instructionFixture();
    if (type === "expired")
      data.documents[0].valid_until = new Date(now - 1).toISOString();
    else {
      const other = structuredClone(data.documents[0]);
      other.document_id += "other";
      if (type === "conflict")
        other.facts[1].value = "For PETG on glass only: Apply two layers.";
      else other.product_id = "another-product";
      data.documents.push(other);
    }
    const call = mockAnswer(candidate("Apply {{product}}.", "fact"));
    const result = await synthesizeKnowledgeAnswer({
      execution: await setup(data),
      question,
      call,
      now: () => now,
    });
    expect(result.origin).toBe("validated_claim_composer");
    expect(call).not.toHaveBeenCalled();
  }
});
it("keeps referral/clarification useful without granting a procedure or new source", async () => {
  const execution = await setup();
  for (const text of SYNTHESIS_SAFE_NEXT_STEPS) {
    const draft = candidate(text);
    const call = mockAnswer(draft, []);
    const answer = await synthesizeKnowledgeAnswer({
      execution,
      question:
        text === "Which build plate are you using?"
          ? "Is Magigoo Original suitable for PETG?"
          : text === "What material are you printing?"
            ? "Is Magigoo Original suitable on glass?"
            : "Where can I find the manufacturer's guidance?",
      call,
      now: () => now,
    });
    expect(answer.origin).toBe("reviewed_llm_synthesis");
    expect(answer.text).toBe(text);
    expect(answer.sources).toEqual([]);
    expect(call).toHaveBeenCalledTimes(2);
  }
  const call = mockAnswer(
    candidate(SYNTHESIS_SAFE_NEXT_STEPS[0] + " Or try a little on the corner."),
    [],
  );
  expect(
    (
      await synthesizeKnowledgeAnswer({
        execution,
        question: "Is Magigoo Original suitable for PETG on glass?",
        call,
        now: () => now,
      })
    ).origin,
  ).toBe("validated_claim_composer");
  expect(call).toHaveBeenCalledTimes(1);
});
it.each([
  "Could I put it on a textured PEI sheet?",
  "What about textured PEI?",
  "Can I use it on coated glass?",
  "Will it work for nylon on glass?",
])(
  "keeps unsupported use paraphrases on the useful fallback: %s",
  async (question) => {
    const execution = await setup();
    const call = mockAnswer(candidate("Try {{product}} on a corner."));
    const answer = await synthesizeKnowledgeAnswer({
      execution,
      question,
      previousQuestion:
        "I'm printing PETG on glass. Is Magigoo Original suitable?",
      call,
      now: () => now,
    });
    expect(answer.origin).toBe("validated_claim_composer");
    expect(answer.text).not.toMatch(/try|small area|harmless/);
    expect(call).not.toHaveBeenCalled();
  },
);
it("normalizes common obfuscation, blocks arbitrary guidance, and keeps descriptive tested facts eligible", async () => {
  const packet = synthesisEvidence(await setup(), now)!;
  for (const text of [
    "Ａｐｐｌｙ {{product}} on a corner.",
    "ap\u200bply {{product}} on a corner.",
    "âpply {{product}} on a corner.",
  ]) {
    expect(
      diagnoseHardCheckDraft(draftSchema.parse(candidate(text, "fact")), packet)
        .ok,
    ).toBe(false);
  }
  expect(
    diagnoseHardCheckDraft(
      draftSchema.parse(candidate("An unrelated suggestion.")),
      packet,
    ),
  ).toMatchObject({ ok: false, code: "unbounded_guidance" });
  expect(
    diagnoseHardCheckDraft(
      draftSchema.parse(
        candidate(
          "{{product}} is designed and tested for PETG on glass build plates.",
          "fact",
        ),
      ),
      packet,
    ),
  ).toEqual({ ok: true });
  expect(
    requiresProcedureFallback(packet, {
      question: "Is Magigoo Original suitable for PETG on glass?",
    }),
  ).toBe(false);
});
it("does not let approved instruction references bypass existing thermal/electrical or numeric safeguards", async () => {
  const data = instructionFixture();
  data.documents[0].facts[1].value =
    "For PETG on glass only: Apply it at 500°C.";
  const packet = synthesisEvidence(await setup(data), now)!;
  const draft = draftSchema.parse({
    segments: [
      {
        kind: "fact",
        text: "{{product}}: " + data.documents[0].facts[1].value,
        productKey: "p1",
        evidenceIds: ["f2"],
      },
    ],
  });
  expect(diagnoseHardCheckDraft(draft, packet, { question })).toMatchObject({
    ok: false,
    code: "thermal_or_electrical_advice",
  });
});

it.each([
  "supplier",
  "other_surface_in_body",
  "other_material_in_body",
  "operational_body",
])(
  "refuses an instruction with %s even when its header matches",
  async (type) => {
    const data = instructionFixture();
    if (type === "supplier")
      data.documents[0].source_kind = "supplier_product_page";
    else
      data.documents[0].facts[1].value =
        instruction +
        (type === "other_surface_in_body"
          ? " Then use it on PEI."
          : type === "other_material_in_body"
            ? " Repeat for TPU."
            : " Change the heater wiring.");
    const execution = await setup(data);
    const call = mockAnswer(
      candidate("{{product}}: " + data.documents[0].facts[1].value, "fact"),
    );
    const answer = await synthesizeKnowledgeAnswer({
      execution,
      question,
      call,
      now: () => now,
    });
    expect(answer.origin).toBe("validated_claim_composer");
    expect(call).not.toHaveBeenCalled();
  },
);
it("supports explicit surface-test instruction evidence within the same verified scope", async () => {
  const data = instructionFixture();
  data.documents[0].facts[1].field = "surface_test_instructions";
  const execution = await setup(data);
  const packet = synthesisEvidence(execution, now)!;
  const draft = draftSchema.parse({
    segments: [
      {
        kind: "fact",
        text: "{{product}}: " + instruction,
        productKey: "p1",
        evidenceIds: ["f2"],
      },
    ],
  });
  expect(
    diagnoseHardCheckDraft(draft, packet, {
      question: "How do I test Example Adhesive for PETG on glass?",
    }),
  ).toEqual({ ok: true });
  expect(diagnoseHardCheckDraft(draft, packet)).toMatchObject({
    ok: false,
    code: "instruction_scope_unverified",
  });
});
