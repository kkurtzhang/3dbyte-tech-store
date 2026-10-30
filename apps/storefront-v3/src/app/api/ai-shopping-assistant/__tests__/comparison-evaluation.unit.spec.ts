/** @jest-environment node */
import { ComparisonBudget } from "../comparison-budget";
import { comparisonArm, comparisonMetadata } from "../comparison-context";
import {
  comparisonCases,
  createComparisonEvalFetch,
  runGroundedComparison,
} from "../comparison-evaluation";
const now = Date.parse("2026-10-30T03:00:00Z");
const config = () => ({
  runId: "synthetic-comparison",
  releaseSha: "a".repeat(40),
  now: () => now,
  pricing: {
    model: "deepseek-flash",
    modelVersion: "fictional-fixture",
    providerOrigin: "https://api.deepseek.com",
    contextTokens: 1_000_000,
    inputUsdPerMillion: "0.000001",
    outputUsdPerMillion: "0.000001",
    sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing/",
    verifiedAt: new Date(now).toISOString(),
    validUntil: new Date(now + 3_600_000).toISOString(),
  },
});
const endpointUrl = "https://store.example/api/ai-shopping-assistant";
function streamResponse() {
  const events = [
    { type: "start", messageId: "fixture" },
    { type: "text-start", id: "answer" },
    {
      type: "text-delta",
      id: "answer",
      delta: "Synthetic observation, not a measured model response.",
    },
    { type: "text-end", id: "answer" },
    { type: "finish", finishReason: "stop" },
  ];
  return new Response(
    events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") +
      "data: [DONE]\n\n",
    {
      headers: {
        "x-3db-langfuse-trace-id": "f".repeat(32),
        "x-3db-release-sha": "a".repeat(40),
        "x-3db-ai-model": "deepseek-flash",
        "x-3db-ai-temperature": "0.2",
        "x-3db-ai-prompt-version": "1",
        "x-3db-ai-guardrails-version": "fixture",
      },
    },
  );
}
it("uses twelve natural turns per arm with the existing strict case rubrics", () => {
  expect(comparisonCases).toHaveLength(10);
  expect(
    comparisonCases.reduce((n, c) => n + (c.customerPrompts?.length ?? 1), 0),
  ).toBe(12);
  expect(
    comparisonCases.every((c) => !c.customerPrompt.includes("cite it")),
  ).toBe(true);
  expect(
    comparisonCases.find((c) => c.id === "dragonfly-temperature-follow-up")
      ?.expectedAnswer.forbiddenPatterns?.length,
  ).toBeGreaterThan(0);
});
it("holds context through full stream consumption and records actual returned trace IDs without a new connection", async () => {
  const budget = new ComparisonBudget(config());
  const onTurn = jest.fn(async () => {});
  const fetchImpl = createComparisonEvalFetch({
    budget,
    arm: "trial",
    endpointUrl,
    onTurn,
    invokeAssistant: async (request) => {
      expect(request.headers.get("origin")).toBe("https://store.example");
      expect(comparisonArm()).toBe("trial");
      return new Response(
        new ReadableStream({
          pull(controller) {
            expect(comparisonArm()).toBe("trial");
            controller.enqueue(new TextEncoder().encode("fixture body"));
            controller.close();
          },
        }),
        { headers: { "x-3db-langfuse-trace-id": "f".repeat(32) } },
      );
    },
  });
  const response = await fetchImpl(endpointUrl, { method: "POST", body: "{}" });
  expect(await response.text()).toBe("fixture body");
  expect(onTurn).toHaveBeenCalledWith(
    expect.objectContaining({ runId: "synthetic-comparison" }),
    "f".repeat(32),
  );
  expect(comparisonArm()).toBeUndefined();
});
it("runs each arm once, persists the reservation before invocation, paces turns and keeps failed quality scores", async () => {
  const budget = new ComparisonBudget(config());
  const persist = jest.fn(async () => {});
  const sleep = jest.fn(async () => {});
  const arms: string[] = [];
  const result = await runGroundedComparison({
    budget,
    origin: "https://store.example",
    persistReceipt: persist,
    sleep,
    invokeAssistant: async () => {
      expect(persist).toHaveBeenCalled();
      arms.push(comparisonArm()!);
      expect(comparisonMetadata()).toHaveProperty("comparison_run_id");
      return streamResponse();
    },
  });
  expect(arms).toEqual([
    ...Array(12).fill("baseline"),
    ...Array(12).fill("trial"),
  ]);
  expect(result.results).toHaveLength(20);
  expect(result.results.some((r) => !r.result.passed)).toBe(true);
  expect(sleep).toHaveBeenCalledTimes(23);
  expect(sleep).toHaveBeenLastCalledWith(6500);
  expect(result.receipt.turns).toHaveLength(24);
  expect(result.receipt.traces).toHaveLength(24);
});
it("stops before invocation on missing receipt persistence and stops after missing trace/release diagnostics", async () => {
  const invoke = jest.fn(async () => streamResponse());
  await expect(
    runGroundedComparison({
      budget: new ComparisonBudget(config()),
      origin: "https://store.example",
      persistReceipt: async () => {
        throw Error("receipt unavailable");
      },
      sleep: async () => {},
      invokeAssistant: invoke,
    }),
  ).rejects.toThrow("receipt unavailable");
  expect(invoke).not.toHaveBeenCalled();
  await expect(
    runGroundedComparison({
      budget: new ComparisonBudget(config()),
      origin: "https://store.example",
      persistReceipt: async () => {},
      sleep: async () => {},
      invokeAssistant: async () => new Response("fixture", { status: 200 }),
    }),
  ).rejects.toThrow(/diagnostics incomplete/);
});
it("bounds ignored aborts and never permits more than twelve turns or another origin", async () => {
  const budget = new ComparisonBudget(config());
  const abort = new AbortController();
  const fetchImpl = createComparisonEvalFetch({
    budget,
    arm: "trial",
    endpointUrl,
    onTurn: async () => {},
    invokeAssistant: async () => new Promise<Response>(() => {}),
  });
  const pending = fetchImpl(endpointUrl, { signal: abort.signal });
  abort.abort();
  await expect(pending).rejects.toThrow(/aborted/);
  await expect(fetchImpl("https://other.example", {})).rejects.toThrow(
    /endpoint/,
  );
});

it("runs offline pricing preflight with no credentials and refuses the conservative real-rate quote under $2", async () => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const { spawnSync } = await import("node:child_process");
  const dir = await mkdtemp(join(tmpdir(), "comparison-pricing-"));
  try {
    const file = join(dir, "public-pricing.json");
    const p = {
      ...config().pricing,
      verifiedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 3600000).toISOString(),
    };
    const command = () =>
      spawnSync(
        process.execPath,
        [
          "--loader",
          "ts-node/esm",
          resolve("scripts/comparison-preflight.ts"),
          file,
          "a".repeat(40),
          "synthetic-offline-only",
        ],
        {
          cwd: process.cwd(),
          env: {
            PATH: process.env.PATH,
            NODE_ENV: "test",
            TS_NODE_TRANSPILE_ONLY: "true",
            NODE_NO_WARNINGS: "1",
          },
          encoding: "utf8",
          timeout: 10000,
        },
      );
    await writeFile(file, JSON.stringify(p));
    const pass = command();
    expect(pass.status).toBe(0);
    expect(pass.stdout).toContain("offline_preflight_only");
    await writeFile(
      file,
      JSON.stringify({
        ...p,
        inputUsdPerMillion: "0.30",
        outputUsdPerMillion: "1.20",
      }),
    );
    const denied = command();
    expect(denied.status).toBe(1);
    expect(denied.stdout).toContain("50.696640");
    expect(denied.stderr).toContain("No provider request");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it("rejects oversized response streams and already-aborted turns before retaining an answer", async () => {
  const budget = new ComparisonBudget(config());
  const fetchImpl = createComparisonEvalFetch({
    budget,
    arm: "trial",
    endpointUrl,
    onTurn: async () => {},
    invokeAssistant: async () =>
      new Response("x".repeat(2000001), {
        headers: { "x-3db-langfuse-trace-id": "f".repeat(32) },
      }),
  });
  await expect(fetchImpl(endpointUrl, {})).rejects.toThrow(/response exceeds/);
  const abort = new AbortController();
  abort.abort();
  await expect(
    fetchImpl(endpointUrl, { signal: abort.signal }),
  ).rejects.toThrow(/aborted/);
  await expect(
    runGroundedComparison({
      budget: new ComparisonBudget(config()),
      origin: "http://store.example",
      invokeAssistant: async () => streamResponse(),
      persistReceipt: async () => {},
    }),
  ).rejects.toThrow(/HTTPS/);
});
