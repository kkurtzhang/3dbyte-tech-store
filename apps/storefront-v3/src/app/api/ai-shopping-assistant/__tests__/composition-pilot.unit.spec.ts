/** @jest-environment node */
import observed from "../__fixtures__/observed-answer-repetition.json";
import {
  ComparisonBudget,
  quoteComparison,
  COMPOSITION_PILOT_PLAN,
} from "../comparison-budget";
import { createKnowledgeExecution } from "../knowledge-execution";
import {
  runCompositionPilot,
  COMPOSITION_PILOT_CASES,
} from "../composition-pilot";
const now = Date.parse(observed.provenance.observedAt);
const pricing = {
  model: "deepseek-flash",
  modelVersion: "DeepSeek-V4.1-Flash-1017",
  providerOrigin: "https://api.deepseek.com",
  contextTokens: 1048576,
  inputUsdPerMillion: "0.30",
  outputUsdPerMillion: "1.20",
  sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing/",
  verifiedAt: new Date(now).toISOString(),
  validUntil: new Date(now + 3600000).toISOString(),
};
const budget = () =>
  new ComparisonBudget({
    runId: "synthetic-three-case",
    releaseSha: "a".repeat(40),
    pricing,
    plan: COMPOSITION_PILOT_PLAN,
    now: () => now,
  });
it("reserves at most six requests and USD1.892118 with no planner, repair or hidden retries", () => {
  expect(quoteComparison(pricing, now, COMPOSITION_PILOT_PLAN)).toMatchObject({
    maximumCalls: 6,
    maximumInputTokens: 6291456,
    maximumOutputTokens: 3900,
    reservedUsd: "1.892118",
  });
});
it("uses the identical fresh packet for both arms and keeps all failures visible without repair", async () => {
  const b = budget();
  const call = jest.fn(async ({ stage }: { stage: string }) => ({
    text: JSON.stringify(
      stage === "draft"
        ? {
            segments: [
              {
                kind: "fact",
                text: "{{product}} supports PETG on glass.",
                productKey: "p1",
                evidenceIds: ["f1"],
              },
            ],
          }
        : {
            verdict: "repair",
            coverage: [],
            findings: ["not_customer_focused"],
          },
    ),
  }));
  const results = await runCompositionPilot({
    budget: b,
    now: () => now,
    loadEvidence: async (c) => {
      const e = createKnowledgeExecution(
        async () =>
          observed.cases[c.productQuery.includes("Dragonfly") ? 0 : 1]
            .knowledge,
        () => now,
      );
      await e.execute({ query: c.question }, { toolCallId: c.id });
      return e;
    },
    call,
    observe: async (_c, _arm, fn) => ({
      answer: await fn(),
      traceId: "f".repeat(32),
      ingestionVerified: true,
    }),
    persist: async () => {},
  });
  expect(results.cases).toHaveLength(3);
  expect(call).toHaveBeenCalledTimes(4);
  expect(results.cases[2].outcome).toMatchObject({
    reason: "ineligible",
    calls: 0,
  });
  expect(call.mock.calls.every(([v]) => v.stage !== "repair")).toBe(true);
  expect(
    results.cases.every(
      (c) =>
        c.sameEvidence && c.trial?.answer.origin === "validated_claim_composer",
    ),
  ).toBe(true);
  expect(results.cases.map((c) => c.question)).toEqual(
    COMPOSITION_PILOT_CASES.map((c) => c.question),
  );
});

async function fixtureEvidence(c: {
  productQuery: string;
  question: string;
  id: string;
}) {
  const e = createKnowledgeExecution(
    async () =>
      observed.cases[c.productQuery.includes("Dragonfly") ? 0 : 1].knowledge,
    () => now,
  );
  await e.execute({ query: c.question }, { toolCallId: c.id });
  return e;
}
it("does not synthesize empty, stale or conflicting evidence and does not invent sources", async () => {
  const call = jest.fn(async () => ({ text: "{}" }));
  const report = await runCompositionPilot({
    budget: budget(),
    now: () => now,
    loadEvidence: async () => createKnowledgeExecution(async () => null),
    call,
    observe: async (_c, _a, fn) => ({
      answer: await fn(),
      traceId: "f".repeat(32),
      ingestionVerified: true,
    }),
    persist: async () => {},
  });
  expect(call).not.toHaveBeenCalled();
  expect(report.cases.every((c) => c.status === "evidence_ineligible")).toBe(
    true,
  );
});
it("stops before a paid draft on unverified baseline traces", async () => {
  const call = jest.fn(async () => ({ text: "{}" }));
  const report = await runCompositionPilot({
    budget: budget(),
    now: () => now,
    loadEvidence: fixtureEvidence,
    call,
    observe: async (_c, _a, fn) => ({
      answer: await fn(),
      traceId: "f".repeat(32),
      ingestionVerified: false,
    }),
    persist: async () => {},
  });
  expect(call).not.toHaveBeenCalled();
  expect(report.status).toBe("stopped");
});
it("retains malformed-draft fallbacks without a review, repair or resample", async () => {
  const call = jest.fn(async () => ({ text: "{}" }));
  const report = await runCompositionPilot({
    budget: budget(),
    now: () => now,
    loadEvidence: fixtureEvidence,
    call,
    observe: async (_c, _a, fn) => ({
      answer: await fn(),
      traceId: "f".repeat(32),
      ingestionVerified: true,
    }),
    persist: async () => {},
  });
  expect(call).toHaveBeenCalledTimes(2);
  expect(
    report.cases.every((c) => c.status === "synthesis_failed_fallback"),
  ).toBe(true);
});

// Newly authored synthetic outputs, not recovered November 1 provider drafts.
it.each([
  undefined,
  { captureRejectedDrafts: "synthetic-pilot-only" as const },
])(
  "captures rejected drafts privately only with explicit synthetic opt-in: %p",
  async (diagnostics) => {
    const marker = "SYNTHETIC_PRIVATE_DRAFT";
    const raw = JSON.stringify({
      segments: [
        {
          kind: "fact",
          text: marker,
          productKey: "wrong",
          evidenceIds: ["f1"],
        },
      ],
    });
    const call = jest.fn(async () => ({ text: raw }));
    const seen: string[] = [];
    const report = await runCompositionPilot({
      budget: budget(),
      now: () => now,
      diagnostics,
      loadEvidence: fixtureEvidence,
      call,
      observe: async (_c, _a, fn) => {
        const answer = await fn();
        seen.push(JSON.stringify(answer));
        return { answer, traceId: "f".repeat(32), ingestionVerified: true };
      },
      persist: async () => {},
    });
    expect(call).toHaveBeenCalledTimes(2);
    expect(
      report.cases.every(
        (c) => c.sameEvidence && c.status === "synthesis_failed_fallback",
      ),
    ).toBe(true);
    expect(seen.join("")).not.toContain(marker);
    for (const c of report.cases) {
      if (c.id === "magigoo-pei-unknown") {
        expect(c.outcome).toMatchObject({ reason: "ineligible", calls: 0 });
        expect(c.rejectedDraft).toBeUndefined();
        continue;
      }
      expect(c.outcome?.failure).toMatchObject({
        phase: "schema",
        code: "schema_invalid",
      });
      expect(c.rejectedDraft).toEqual(
        diagnostics
          ? expect.objectContaining({
              synthetic: true,
              text: raw,
              sha256: c.outcome!.candidate!.sha256,
            })
          : undefined,
      );
    }
    if (!diagnostics) expect(JSON.stringify(report)).not.toContain(marker);
  },
);
it("omits oversized UTF-8 draft text instead of truncating it or changing fallback", async () => {
  const raw = JSON.stringify({ extra: "🧪".repeat(1100) });
  const report = await runCompositionPilot({
    budget: budget(),
    now: () => now,
    diagnostics: { captureRejectedDrafts: "synthetic-pilot-only" },
    loadEvidence: fixtureEvidence,
    call: async () => ({ text: raw }),
    observe: async (_c, _a, fn) => ({
      answer: await fn(),
      traceId: "f".repeat(32),
      ingestionVerified: true,
    }),
    persist: async () => {},
  });
  expect(report.cases).toHaveLength(3);
  for (const c of report.cases) {
    if (c.id === "magigoo-pei-unknown") {
      expect(c.outcome).toMatchObject({ reason: "ineligible", calls: 0 });
      expect(c.rejectedDraft).toBeUndefined();
      continue;
    }
    expect(c.rejectedDraft).toMatchObject({
      omittedReason: "byte_limit",
      utf8Bytes: Buffer.byteLength(raw),
    });
    expect(c.rejectedDraft).not.toHaveProperty("text");
    expect(c.trial!.answer).toEqual(c.baseline!.answer);
  }
});
it("does not capture accepted drafts even with synthetic opt-in", async () => {
  const report = await runCompositionPilot({
    budget: budget(),
    now: () => now,
    diagnostics: { captureRejectedDrafts: "synthetic-pilot-only" },
    loadEvidence: fixtureEvidence,
    call: async ({ stage }) => ({
      text: JSON.stringify(
        stage === "draft"
          ? {
              segments: [
                {
                  kind: "guidance",
                  text: "Which build plate are you using?",
                  productKey: "p1",
                  evidenceIds: [],
                },
              ],
            }
          : {
              verdict: "accept",
              findings: [],
              coverage: [{ index: 0, supported: true, evidenceIds: [] }],
            },
      ),
    }),
    observe: async (_c, _a, fn) => ({
      answer: await fn(),
      traceId: "f".repeat(32),
      ingestionVerified: true,
    }),
    persist: async () => {},
  });
  expect(
    report.cases.every(
      (c) =>
        (c.id === "magigoo-pei-unknown"
          ? c.outcome?.reason === "ineligible"
          : c.status === "synthesis_accepted") && c.rejectedDraft === undefined,
    ),
  ).toBe(true);
});
it("keeps an opt-in rejected draft when later trace verification fails without resampling", async () => {
  const raw = JSON.stringify({ unexpected: "SYNTHETIC_REJECTION" });
  const call = jest.fn(async () => ({ text: raw }));
  const report = await runCompositionPilot({
    budget: budget(),
    now: () => now,
    diagnostics: { captureRejectedDrafts: "synthetic-pilot-only" },
    loadEvidence: fixtureEvidence,
    call,
    observe: async (_c, arm, fn) => ({
      answer: await fn(),
      traceId: "f".repeat(32),
      ingestionVerified: arm === "baseline",
    }),
    persist: async () => {},
  });
  expect(report.status).toBe("stopped");
  expect(call).toHaveBeenCalledTimes(1);
  expect(report.cases).toHaveLength(1);
  expect(report.cases[0].rejectedDraft?.text).toBe(raw);
  expect(report.cases[0].outcome?.failure?.code).toBe("schema_invalid");
});
