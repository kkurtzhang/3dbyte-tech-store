/** @jest-environment node */
import {
  ComparisonBudget,
  quoteComparison,
  type ComparisonPricing,
} from "../comparison-budget";
import {
  runComparisonTurn,
  comparisonFetch,
  comparisonRouteSettings,
  withComparisonStage,
  comparisonMetadata,
  comparisonArm,
} from "../comparison-context";
const now = Date.parse("2026-10-30T03:00:00Z");
// Fictional cheap rates exercise execution without any real provider. Not a live pricing profile.
export const pricing: ComparisonPricing = {
  model: "deepseek-flash",
  modelVersion: "fixture-version",
  providerOrigin: "https://api.deepseek.com",
  contextTokens: 1_000_000,
  inputUsdPerMillion: "0.000001",
  outputUsdPerMillion: "0.000001",
  sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing/",
  verifiedAt: new Date(now).toISOString(),
  validUntil: new Date(now + 3_600_000).toISOString(),
};
const config = () => ({
  runId: "synthetic-comparison",
  releaseSha: "a".repeat(40),
  pricing,
  maximumUsd: "2.00",
  now: () => now,
});
const request = (max_tokens = 1800, extra: object = {}) => ({
  method: "POST",
  body: JSON.stringify({
    model: "deepseek-flash",
    messages: [{ role: "user", content: "synthetic" }],
    max_tokens,
    thinking: { type: "disabled" },
    ...extra,
  }),
});
it("preflights all 24 turns including both reviews and repair using integer money arithmetic", () => {
  const quote = quoteComparison(pricing, now);
  expect(quote).toMatchObject({
    turns: 24,
    maximumCalls: 168,
    maximumOutputTokens: 247200,
    maximumInputTokens: 168_000_000,
  });
  expect(quote.reservedUsd).toBe("0.000336"); // 1 micro input + ceiling-rounded 1 micro output per call
});
it("fails closed for missing, zero, stale, future, malformed or unknown pricing and over-budget plans", () => {
  for (const p of [
    undefined,
    {},
    { ...pricing, inputUsdPerMillion: "0" },
    { ...pricing, outputUsdPerMillion: "NaN" },
    { ...pricing, model: "unknown" },
    { ...pricing, validUntil: new Date(now - 1).toISOString() },
    { ...pricing, verifiedAt: new Date(now + 1).toISOString() },
    { ...pricing, contextTokens: 0 },
  ])
    expect(
      () =>
        new ComparisonBudget({ ...config(), pricing: p as ComparisonPricing }),
    ).toThrow();
  expect(
    () =>
      new ComparisonBudget({
        ...config(),
        pricing: {
          ...pricing,
          inputUsdPerMillion: "0.30",
          outputUsdPerMillion: "1.20",
        },
      }),
  ).toThrow(/reservation exceeds/i);
  expect(
    () => new ComparisonBudget({ ...config(), maximumUsd: "2.01" }),
  ).toThrow();
});
it("reports the full-context conservative reservation honestly instead of calling $2 a provider hard cap", () => {
  const quote = quoteComparison(
    { ...pricing, inputUsdPerMillion: "0.30", outputUsdPerMillion: "1.20" },
    now,
  );
  expect(quote.reservedUsd).toBe("50.696640");
  expect(quote).toMatchObject({
    basis: "full_context_cache_miss_reservation",
    providerDollarGuarantee: false,
  });
});
it("counts each HTTP attempt, never refunds a failure or retry, and blocks before egress at the stage limit", async () => {
  const budget = new ComparisonBudget(config());
  const upstream = jest.fn(async () => {
    throw Error("upstream failure");
  });
  const guarded = comparisonFetch(upstream);
  await runComparisonTurn(budget, "baseline", 0, async () => {
    for (let i = 0; i < 5; i++)
      await expect(
        guarded("https://api.deepseek.com/chat/completions", request()),
      ).rejects.toThrow(/reservation retained/);
    await expect(
      guarded("https://api.deepseek.com/chat/completions", request()),
    ).rejects.toThrow(/call quota/i);
  });
  expect(upstream).toHaveBeenCalledTimes(5);
  expect(budget.receipt().calls).toHaveLength(5);
  expect(
    budget.receipt().calls.every((c) => c.outcome === "transport_error"),
  ).toBe(true);
});
it("validates output caps, single completion, origin, model, thinking mode and body before reserving or fetching", async () => {
  const budget = new ComparisonBudget(config());
  const upstream = jest.fn(async () => new Response("fixture"));
  const guarded = comparisonFetch(upstream);
  await runComparisonTurn(budget, "trial", 0, async () => {
    for (const init of [
      request(1801),
      request(1, { model: "unknown" }),
      request(1, { n: 2 }),
      request(1, { thinking: { type: "enabled" } }),
      { method: "POST", body: "not-json" },
    ])
      await expect(
        guarded("https://api.deepseek.com/chat/completions", init),
      ).rejects.toThrow();
    await expect(
      guarded("https://other.example/chat/completions", request()),
    ).rejects.toThrow();
    await expect(
      guarded("https://api.deepseek.com/balance", request()),
    ).rejects.toThrow();
  });
  expect(upstream).not.toHaveBeenCalled();
  expect(budget.receipt().calls).toEqual([]);
});
it("accounts for synthesis, both review attempts and repair separately and cannot transfer unused quotas", async () => {
  const budget = new ComparisonBudget(config());
  const guarded = comparisonFetch(async () => new Response("fixture"));
  await runComparisonTurn(budget, "trial", 0, async () => {
    for (const [stage, cap] of [
      ["draft", 700],
      ["review", 600],
      ["repair", 700],
      ["review", 600],
    ] as const)
      await withComparisonStage(stage, () =>
        guarded("https://api.deepseek.com/chat/completions", request(cap)),
      );
    await expect(
      withComparisonStage("review", () =>
        guarded("https://api.deepseek.com/chat/completions", request(600)),
      ),
    ).rejects.toThrow(/call quota/);
  });
  expect(budget.receipt().calls.map((c) => c.stage)).toEqual([
    "draft",
    "review",
    "repair",
    "review",
  ]);
  await runComparisonTurn(budget, "baseline", 0, async () => {
    await expect(
      withComparisonStage("draft", () =>
        guarded("https://api.deepseek.com/chat/completions", request(700)),
      ),
    ).rejects.toThrow(/call quota/);
  });
});
it("reserves synchronously for concurrent attempts and refuses duplicate, unknown or repeated turns", async () => {
  const budget = new ComparisonBudget(config());
  const guarded = comparisonFetch(async () => new Response("fixture"));
  await runComparisonTurn(budget, "trial", 0, async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        guarded("https://api.deepseek.com/chat/completions", request()),
      ),
    );
    expect(results.filter((v) => v.status === "fulfilled")).toHaveLength(5);
  });
  await expect(
    runComparisonTurn(budget, "trial", 0, async () => {}),
  ).rejects.toThrow(/already used/);
  await expect(
    runComparisonTurn(budget, "trial", 12, async () => {}),
  ).rejects.toThrow();
  expect(budget.receipt().calls).toHaveLength(5);
});
it("expires before egress and an aborted request consumes its reservation rather than authorizing a retry", async () => {
  let clock = now;
  const budget = new ComparisonBudget({ ...config(), now: () => clock });
  const upstream = jest.fn(async () => new Response("fixture"));
  const guarded = comparisonFetch(upstream);
  await runComparisonTurn(budget, "baseline", 0, async () => {
    clock = now + 3_600_001;
    await expect(
      guarded("https://api.deepseek.com/chat/completions", request()),
    ).rejects.toThrow(/pricing/i);
  });
  expect(upstream).not.toHaveBeenCalled();
});
it("does not change ordinary traffic and keeps arm, settings and metadata scoped to trusted async context", async () => {
  const budget = new ComparisonBudget(config());
  const upstream = jest.fn(async () => new Response("fixture"));
  expect(comparisonArm()).toBeUndefined();
  expect(comparisonRouteSettings()).toEqual({});
  expect(comparisonMetadata()).toEqual({});
  await comparisonFetch(upstream)("https://ordinary.example", {
    method: "GET",
  });
  expect(upstream).toHaveBeenCalledTimes(1);
  await runComparisonTurn(budget, "trial", 0, async () => {
    await Promise.resolve();
    expect(comparisonArm()).toBe("trial");
    expect(comparisonRouteSettings()).toEqual({
      maxRetries: 0,
      maxOutputTokens: 1800,
    });
    expect(comparisonMetadata()).toMatchObject({
      comparison_run_id: "synthetic-comparison",
      comparison_arm: "trial",
      comparison_turn: 0,
      comparison_budget_basis: "full_context_cache_miss_reservation",
    });
  });
  expect(comparisonArm()).toBeUndefined();
});

it("retains reservations for non-2xx replies and aborted transports and closes late work", async () => {
  const budget = new ComparisonBudget(config());
  const upstream = jest
    .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
    .mockResolvedValueOnce(new Response("fixture", { status: 500 }))
    .mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));
  const guarded = comparisonFetch(upstream);
  await runComparisonTurn(budget, "trial", 0, async () => {
    expect(
      (await guarded("https://api.deepseek.com/chat/completions", request()))
        .status,
    ).toBe(500);
    await expect(
      guarded("https://api.deepseek.com/chat/completions", request()),
    ).rejects.toThrow(/reservation retained/);
  });
  expect(budget.receipt().calls.map((c) => c.outcome)).toEqual([
    "received_response",
    "transport_error",
  ]);
  expect(() =>
    budget.reserve(
      "trial",
      0,
      "route",
      "https://api.deepseek.com/chat/completions",
      request(),
    ),
  ).toThrow(/not open/);
  const receipt = budget.receipt();
  receipt.calls.length = 0;
  expect(budget.receipt().calls).toHaveLength(2);
});

it("pins the expected app release and refuses unknown or all-zero trace IDs", async () => {
  const { assertComparisonReleaseSha } = await import("../comparison-context");
  const budget = new ComparisonBudget(config());
  await runComparisonTurn(budget, "trial", 0, async () => {
    expect(() => assertComparisonReleaseSha("b".repeat(40))).toThrow(
      /SHA mismatch/,
    );
    expect(() => assertComparisonReleaseSha("a".repeat(40))).not.toThrow();
    for (const id of [null, "unknown", "0".repeat(32)])
      expect(() => budget.recordTrace("trial", 0, id)).toThrow(/trace ID/);
    budget.recordTrace("trial", 0, "f".repeat(32));
  });
  expect(budget.receipt().traces).toEqual([
    { arm: "trial", turn: 0, traceId: "f".repeat(32) },
  ]);
});

it("blocks extra completions, multimodal/paid provider tools and oversized payloads before transport", async () => {
  const budget = new ComparisonBudget(config());
  const upstream = jest.fn(async () => new Response("fixture"));
  const guarded = comparisonFetch(upstream);
  await runComparisonTurn(budget, "trial", 0, async () => {
    for (const init of [
      request(1, {
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: "https://fixture.example/image" },
              },
            ],
          },
        ],
      }),
      request(1, { tools: [{ type: "web_search" }] }),
      request(1, { unexpected_paid_feature: true }),
      request(1, { messages: [{ role: "user", content: "x".repeat(262145) }] }),
    ])
      await expect(
        guarded("https://api.deepseek.com/chat/completions", init),
      ).rejects.toThrow();
  });
  expect(upstream).not.toHaveBeenCalled();
});

it("disallows hidden provider redirects while metering the explicit attempted request", async () => {
  const budget = new ComparisonBudget(config());
  const upstream = jest.fn(async () => new Response("fixture"));
  await runComparisonTurn(budget, "baseline", 0, async () => {
    await comparisonFetch(upstream)(
      "https://api.deepseek.com/chat/completions",
      request(),
    );
  });
  expect(upstream).toHaveBeenCalledWith(
    "https://api.deepseek.com/chat/completions",
    expect.objectContaining({ redirect: "error" }),
  );
});
