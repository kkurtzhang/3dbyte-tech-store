/** @jest-environment node */
import observed from "../__fixtures__/observed-answer-repetition.json";
import {
  runStagingCompositionPilot,
  pilotTraceIOMatches,
} from "../pilot-runtime";
let mockProviderFetch: typeof fetch;
let mockActive: string;
const mockTraces = new Map<string, Record<string, unknown>>();
let mockCount = 0;
let mockInvalidUsage = false;
let mockInvalidDraft = false;
let mockTelemetry: unknown[] = [];
jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: (config: { fetch: typeof fetch }) => {
    mockProviderFetch = config.fetch;
    return { chat: () => "synthetic-model" };
  },
}));
jest.mock("../prompt-management", () => ({
  resolveAssistantSystemPrompt: async () => ({
    editableTone: "Helpful",
    metadata: { source: "fixture" },
  }),
}));
jest.mock("@3dbyte-tech-store/observability", () => ({
  isAiTelemetryEnabled: () => true,
  propagateActiveLangfuseTraceAttributes: (_: unknown, fn: () => unknown) =>
    fn(),
  startActiveLangfuseTraceObservation: async (
    _: unknown,
    fn: (span: unknown) => unknown,
  ) => {
    mockActive = String(++mockCount).padStart(32, "a");
    mockTraces.set(mockActive, { id: mockActive, projectId: "estore" });
    const id = mockActive;
    return fn({
      traceId: id,
      update: (v: object) => Object.assign(mockTraces.get(id)!, v),
      end: () => {},
    });
  },
  updateActiveLangfuseTraceIO: (v: object) =>
    Object.assign(mockTraces.get(mockActive)!, v),
}));
jest.mock("ai", () => ({
  generateText: async (config: {
    prompt: string;
    maxOutputTokens: number;
    experimental_telemetry: unknown;
  }) => {
    mockTelemetry.push(config.experimental_telemetry);
    await mockProviderFetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model: "deepseek-flash",
        messages: [{ role: "user", content: "fixture" }],
        max_tokens: config.maxOutputTokens,
      }),
    });
    const input = JSON.parse(config.prompt);
    const dragon = input.question.includes("Dragonfly");
    const pei = input.question.includes("PEI");
    const segments = pei
      ? [
          {
            kind: "guidance",
            text: "Check your plate maker's adhesive instructions before using it on textured PEI.",
            productKey: "p1",
            evidenceIds: [],
          },
        ]
      : [
          {
            kind: "fact",
            text: dragon
              ? "{{product}} is mainly copper alloy."
              : "{{product}} is designed and tested for PETG on glass.",
            productKey: "p1",
            evidenceIds: ["f1"],
          },
        ];
    return {
      text: JSON.stringify(
        input.draft
          ? {
              verdict: "accept",
              findings: [],
              coverage: input.draft.segments.map(
                (s: { evidenceIds: string[] }, index: number) => ({
                  index,
                  supported: true,
                  evidenceIds: s.evidenceIds,
                }),
              ),
            }
          : mockInvalidDraft
            ? {
                segments: [
                  {
                    kind: "fact",
                    text: "SYNTHETIC_PRIVATE_DRAFT",
                    productKey: "wrong",
                    evidenceIds: ["f1"],
                  },
                ],
              }
            : { segments },
      ),
      totalUsage: {
        inputTokens: mockInvalidUsage ? undefined : 10,
        outputTokens: 10,
      },
    };
  },
}));
const originalEnv = process.env,
  originalFetch = global.fetch;
beforeEach(() => {
  mockTraces.clear();
  mockCount = 0;
  mockInvalidUsage = false;
  mockInvalidDraft = false;
  mockTelemetry = [];
  process.env = {
    ...originalEnv,
    NODE_ENV: "production",
    APP_ENV: "staging",
    STOREFRONT_RELEASE_SHA: "a".repeat(40),
    AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED: "false",
    AI_PROVIDER: "deepseek",
    AI_MODEL: "deepseek-flash",
    DEEPSEEK_API_KEY: "fixture-provider",
    INTERNAL_API_TOKEN: "fixture-internal",
    LANGFUSE_HOST: "https://observe.fixture",
    LANGFUSE_PUBLIC_KEY: "fixture-public",
    LANGFUSE_SECRET_KEY: "fixture-secret",
    NEXT_PUBLIC_SITE_URL: "https://store.fixture",
    MEDUSA_SERVER_BACKEND_URL: "https://backend.fixture",
  };
  jest
    .spyOn(Date, "now")
    .mockReturnValue(Date.parse(observed.provenance.observedAt));
});
afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});
it("runs bounded eligible mock transports through the existing tracing path, verifies all six answer traces and records actual usage", async () => {
  global.fetch = jest.fn(async (input, init) => {
    const url = String(input);
    if (url.includes("/api/public/traces/"))
      return Response.json(mockTraces.get(url.split("/").at(-1)!));
    if (url.startsWith("https://api.deepseek.com"))
      return Response.json({ fixture: true });
    const body = JSON.parse(init!.body as string);
    const data =
      observed.cases[body.query.includes("Dragonfly") ? 0 : 1].knowledge;
    if (url.endsWith("/ai/product-guidance")) {
      const d = data.documents[0];
      return Response.json({
        status: "matches",
        mode: "search",
        query: body.query,
        products: [
          {
            id: d.product_id,
            title: d.product_title,
            handle: d.product_handle,
            productUrl: `https://store.fixture/products/${d.product_handle}`,
          },
        ],
      });
    }
    return Response.json(data);
  }) as typeof fetch;
  const now = Date.now();
  const persist = jest.fn(async (report: unknown) => {
    void report;
  });
  const reserve = jest.fn();
  await runStagingCompositionPilot(
    {
      scope: "composition-only-three-cases-six-calls",
      runId: "synthetic-runtime",
      releaseSha: "a".repeat(40),
      pricing: {
        model: "deepseek-flash",
        modelVersion: "DeepSeek-V4.1-Flash-1017",
        providerOrigin: "https://api.deepseek.com",
        contextTokens: 1048576,
        inputUsdPerMillion: "0.30",
        outputUsdPerMillion: "1.20",
        sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing/",
        verifiedAt: new Date(now).toISOString(),
        validUntil: new Date(now + 3600000).toISOString(),
      },
    },
    { persist, reserve },
  );
  const report = persist.mock.calls.at(-1)![0] as {
    status: string;
    cases: Array<{ status: string }>;
    usage: unknown[];
    budget: {
      calls: unknown[];
      traces: unknown[];
      quote: { reservedUsd: string };
    };
  };
  expect(report.status).toBe("completed");
  expect(report.cases.map((c) => c.status)).toEqual([
    "synthesis_accepted",
    "synthesis_accepted",
    "synthesis_failed_fallback",
  ]);
  expect(report.usage).toHaveLength(4);
  expect(report.budget.calls).toHaveLength(4);
  expect(report.budget.traces).toHaveLength(6);
  expect(report.budget.quote.reservedUsd).toBe("1.892118");
  expect(reserve).toHaveBeenCalledTimes(4);
  expect(process.env.AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED).toBe("false");
});

function fixtureRequest() {
  const now = Date.now();
  return {
    scope: "composition-only-three-cases-six-calls" as const,
    runId: "synthetic-runtime-negative",
    releaseSha: "a".repeat(40),
    pricing: {
      model: "deepseek-flash" as const,
      modelVersion: "DeepSeek-V4.1-Flash-1017",
      providerOrigin: "https://api.deepseek.com" as const,
      contextTokens: 1048576,
      inputUsdPerMillion: "0.30",
      outputUsdPerMillion: "1.20",
      sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing/" as const,
      verifiedAt: new Date(now).toISOString(),
      validUntil: new Date(now + 3600000).toISOString(),
    },
  };
}
function installNegativeFetch(traceFailure = false) {
  global.fetch = jest.fn(async (input, init) => {
    const url = String(input);
    if (url.includes("/api/public/traces/"))
      return traceFailure
        ? new Response("fixture denied", { status: 401 })
        : Response.json(mockTraces.get(url.split("/").at(-1)!));
    if (url.startsWith("https://api.deepseek.com"))
      return Response.json({ fixture: true });
    const body = JSON.parse(init!.body as string);
    const data =
      observed.cases[body.query.includes("Dragonfly") ? 0 : 1].knowledge;
    if (url.endsWith("/ai/product-guidance")) {
      const d = data.documents[0];
      return Response.json({
        status: "matches",
        mode: "search",
        query: body.query,
        products: [
          {
            id: d.product_id,
            title: d.product_title,
            handle: d.product_handle,
            productUrl: `https://store.fixture/products/${d.product_handle}`,
          },
        ],
      });
    }
    return Response.json(data);
  }) as typeof fetch;
}
it("does not call a provider when baseline ingestion cannot be verified", async () => {
  installNegativeFetch(true);
  let latest: unknown;
  await runStagingCompositionPilot(fixtureRequest(), {
    persist: async (r) => {
      latest = r;
    },
    reserve: () => {},
  });
  expect(latest).toMatchObject({
    status: "stopped",
    budget: { calls: [] },
    cases: [{ errorCode: "pilot_trace_ingestion_unverified" }],
  });
  expect(
    jest
      .mocked(global.fetch)
      .mock.calls.some(([url]) =>
        String(url).startsWith("https://api.deepseek.com"),
      ),
  ).toBe(false);
});
it("refuses global enablement and invalid pricing before any provider request", async () => {
  installNegativeFetch();
  process.env.AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED = "true";
  await expect(
    runStagingCompositionPilot(fixtureRequest(), {
      persist: async () => {},
      reserve: () => {},
    }),
  ).rejects.toThrow("pilot_runtime_not_ready");
  expect(global.fetch).not.toHaveBeenCalled();
});
it("stops further paid attempts when provider usage is missing and never refunds the first reservation", async () => {
  installNegativeFetch();
  mockInvalidUsage = true;
  let latest: unknown;
  await runStagingCompositionPilot(fixtureRequest(), {
    persist: async (r) => {
      latest = r;
    },
    reserve: () => {},
  });
  expect(latest).toMatchObject({
    status: "stopped_provider_failure",
    fatalReason: "provider_attempt_or_usage_failed",
  });
  expect(
    (latest as { budget: { calls: unknown[] } }).budget.calls,
  ).toHaveLength(1);
});

it("verifies exact structured trace I/O in parsed or JSON-encoded API responses without accepting missing source fields", () => {
  const answer = {
    text: "Supported answer.",
    origin: "validated_claim_composer" as const,
    sources: [
      {
        sourceType: "url" as const,
        id: "source",
        url: "https://source.fixture",
        title: "Exact scope",
      },
    ],
  };
  const output = { sources: answer.sources, text: answer.text };
  expect(
    pilotTraceIOMatches("Natural question", output, "Natural question", answer),
  ).toBe(true);
  expect(
    pilotTraceIOMatches(
      JSON.stringify("Natural question"),
      JSON.stringify(output),
      "Natural question",
      answer,
    ),
  ).toBe(true);
  expect(
    pilotTraceIOMatches("Other question", output, "Natural question", answer),
  ).toBe(false);
  expect(
    pilotTraceIOMatches(
      "Natural question",
      { text: answer.text, sources: [] },
      "Natural question",
      answer,
    ),
  ).toBe(false);
  expect(
    pilotTraceIOMatches(
      "Natural question",
      {
        text: answer.text,
        sources: [{ ...answer.sources[0], url: "https://wrong.fixture" }],
      },
      "Natural question",
      answer,
    ),
  ).toBe(false);
});

it.each([false, true])(
  "keeps synthetic rejected text in opt-in private receipts only, never Langfuse: %p",
  async (enabled) => {
    mockInvalidDraft = true;
    global.fetch = jest.fn(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/public/traces/"))
        return Response.json(mockTraces.get(url.split("/").at(-1)!));
      if (url.startsWith("https://api.deepseek.com"))
        return Response.json({ fixture: true });
      const body = JSON.parse(init!.body as string);
      const data =
        observed.cases[body.query.includes("Dragonfly") ? 0 : 1].knowledge;
      const d = data.documents[0];
      return Response.json(
        url.endsWith("/ai/product-guidance")
          ? {
              status: "matches",
              mode: "search",
              query: body.query,
              products: [
                {
                  id: d.product_id,
                  title: d.product_title,
                  handle: d.product_handle,
                  productUrl: `https://store.fixture/products/${d.product_handle}`,
                },
              ],
            }
          : data,
      );
    }) as typeof fetch;
    let latest: unknown;
    await runStagingCompositionPilot(
      {
        ...fixtureRequest(),
        ...(enabled
          ? {
              diagnostics: {
                captureRejectedDrafts: "synthetic-pilot-only" as const,
              },
            }
          : {}),
      },
      {
        persist: async (r) => {
          latest = r;
        },
        reserve: () => {},
      },
    );
    const report = latest as {
      cases: Array<{
        rejectedDraft?: { text?: string };
        outcome: { reason: string; calls: number; failure?: { code: string } };
      }>;
      budget: { calls: unknown[] };
    };
    expect(report.budget.calls).toHaveLength(2);
    expect(mockTelemetry).toHaveLength(2);
    for (const options of mockTelemetry)
      expect(options).toMatchObject({
        recordInputs: false,
        recordOutputs: false,
      });
    expect(
      report.cases.every((c, index) =>
        index === 2
          ? c.outcome.reason === "ineligible" &&
            c.outcome.calls === 0 &&
            !c.outcome.failure
          : c.outcome.failure?.code === "schema_invalid",
      ),
    ).toBe(true);
    expect(
      report.cases.every(
        (c, index) =>
          c.rejectedDraft?.text?.includes("SYNTHETIC_PRIVATE_DRAFT") ===
          (enabled && index < 2 ? true : undefined),
      ),
    ).toBe(true);
    expect(JSON.stringify(Array.from(mockTraces.values()))).not.toContain(
      "SYNTHETIC_PRIVATE_DRAFT",
    );
    expect(JSON.stringify(Array.from(mockTraces.values()))).toContain(
      "synthesis_failure_code",
    );
    if (!enabled)
      expect(JSON.stringify(latest)).not.toContain("SYNTHETIC_PRIVATE_DRAFT");
  },
);
