import { z } from "zod";

export const COMPARISON_BUDGET_VERSION =
  "2026-10-30.full-context-reservation-1";
export type ComparisonArm = "baseline" | "trial";
export type ComparisonStage = "route" | "draft" | "review" | "repair";
const MICRO = BigInt(1_000_000);
const money = z
  .string()
  .max(20)
  .regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/);
const pricingSchema = z
  .object({
    model: z.literal("deepseek-flash"),
    modelVersion: z
      .string()
      .min(1)
      .max(100)
      .refine((v) => !["unknown", "latest", "null"].includes(v.toLowerCase())),
    providerOrigin: z.literal("https://api.deepseek.com"),
    contextTokens: z.number().int().min(1800).max(2_000_000),
    inputUsdPerMillion: money,
    outputUsdPerMillion: money,
    sourceUrl: z.literal("https://api-docs.deepseek.com/quick_start/pricing/"),
    verifiedAt: z.string().datetime(),
    validUntil: z.string().datetime(),
  })
  .strict();
export type ComparisonPricing = z.infer<typeof pricingSchema>;
function record(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function textMessage(v: unknown) {
  if (!record(v)) return false;
  return (
    v.content === null ||
    typeof v.content === "string" ||
    (Array.isArray(v.content) &&
      (v.content as unknown[]).every(
        (c) => record(c) && c.type === "text" && typeof c.text === "string",
      ))
  );
}
export const COMPARISON_LIMITS = {
  turnsPerArm: 12,
  maximumUsd: "2.00",
  maximumRequestBytes: 262_144,
  stages: {
    route: { calls: 5, outputTokens: 1800 },
    draft: { calls: 1, outputTokens: 700 },
    review: { calls: 2, outputTokens: 600 },
    repair: { calls: 1, outputTokens: 700 },
  },
} as const;
function micros(value: string) {
  if (!money.safeParse(value).success) throw Error("Invalid USD amount");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * MICRO + BigInt(fraction.padEnd(6, "0"));
}
function usd(value: bigint) {
  return `${value / MICRO}.${String(value % MICRO).padStart(6, "0")}`;
}
function ceilDivide(value: bigint, by: bigint) {
  return (value + by - BigInt(1)) / by;
}
function currentPricing(input: unknown, now: number): ComparisonPricing {
  const parsed = pricingSchema.safeParse(input);
  if (!parsed.success) throw Error("Explicit valid model pricing is required");
  const p = parsed.data;
  const verified = Date.parse(p.verifiedAt),
    until = Date.parse(p.validUntil);
  if (
    !Number.isFinite(now) ||
    verified > now ||
    now >= until ||
    until <= verified ||
    until - verified > 86_400_000 ||
    now - verified > 86_400_000 ||
    micros(p.inputUsdPerMillion) <= BigInt(0) ||
    micros(p.outputUsdPerMillion) <= BigInt(0)
  )
    throw Error("Model pricing is missing, expired or not current");
  return p;
}
function reservation(p: ComparisonPricing, outputTokens: number) {
  // Full documented context at the cache-miss/peak upper rate avoids pretending
  // byte counts are exact input-token counts. Output is over-reserved separately.
  return (
    ceilDivide(BigInt(p.contextTokens) * micros(p.inputUsdPerMillion), MICRO) +
    ceilDivide(BigInt(outputTokens) * micros(p.outputUsdPerMillion), MICRO)
  );
}
export function quoteComparison(input: unknown, now = Date.now()) {
  const p = currentPricing(input, now);
  let count = 0,
    outputs = 0,
    total = BigInt(0);
  for (const [stage, limit] of Object.entries(COMPARISON_LIMITS.stages)) {
    const calls = limit.calls * 12 * (stage === "route" ? 2 : 1);
    count += calls;
    outputs += calls * limit.outputTokens;
    total += BigInt(calls) * reservation(p, limit.outputTokens);
  }
  return {
    version: COMPARISON_BUDGET_VERSION,
    turns: 24,
    maximumCalls: count,
    maximumInputTokens: count * p.contextTokens,
    maximumOutputTokens: outputs,
    reservedUsd: usd(total),
    basis: "full_context_cache_miss_reservation" as const,
    providerDollarGuarantee: false as const,
  };
}
export type ComparisonCallReceipt = {
  id: number;
  arm: ComparisonArm;
  turn: number;
  stage: ComparisonStage;
  outputTokenLimit: number;
  reservedUsd: string;
  outcome: "reserved" | "received_response" | "transport_error";
};
export class ComparisonBudget {
  readonly runId: string;
  readonly releaseSha: string;
  readonly quote: ReturnType<typeof quoteComparison>;
  private readonly pricing: ComparisonPricing;
  private readonly now: () => number;
  private readonly turns = new Map<string, "open" | "closed">();
  private readonly calls: ComparisonCallReceipt[] = [];
  private readonly traces: Array<{
    arm: ComparisonArm;
    turn: number;
    traceId: string;
  }> = [];
  constructor(config: {
    runId: string;
    releaseSha: string;
    pricing: unknown;
    maximumUsd?: string;
    now?: () => number;
  }) {
    if (
      !/^[a-zA-Z0-9._:-]{1,100}$/.test(config.runId) ||
      !/^[a-f0-9]{40}$/.test(config.releaseSha)
    )
      throw Error("Comparison run identity and exact release SHA are required");
    this.runId = config.runId;
    this.releaseSha = config.releaseSha;
    this.now = config.now ?? Date.now;
    this.pricing = Object.freeze(currentPricing(config.pricing, this.now()));
    this.quote = Object.freeze(quoteComparison(this.pricing, this.now()));
    const limit = micros(config.maximumUsd ?? COMPARISON_LIMITS.maximumUsd);
    if (limit <= BigInt(0) || limit > micros(COMPARISON_LIMITS.maximumUsd))
      throw Error("Comparison reservation limit must not exceed USD 2");
    if (micros(this.quote.reservedUsd) > limit)
      throw Error(
        `Conservative reservation exceeds USD limit: ${this.quote.reservedUsd}`,
      );
  }
  openTurn(arm: ComparisonArm, turn: number) {
    if (
      !["baseline", "trial"].includes(arm) ||
      !Number.isInteger(turn) ||
      turn < 0 ||
      turn >= 12
    )
      throw Error("Unknown comparison turn");
    currentPricing(this.pricing, this.now());
    const key = `${arm}:${turn}`;
    if (this.turns.has(key))
      throw Error("Comparison turn already used; no automatic reruns");
    this.turns.set(key, "open");
  }
  closeTurn(arm: ComparisonArm, turn: number) {
    this.turns.set(`${arm}:${turn}`, "closed");
  }
  reserve(
    arm: ComparisonArm,
    turn: number,
    stage: ComparisonStage,
    url: string,
    init?: RequestInit,
  ) {
    currentPricing(this.pricing, this.now());
    if (this.turns.get(`${arm}:${turn}`) !== "open")
      throw Error("Comparison turn is not open");
    const target = new URL(url);
    if (
      target.origin !== this.pricing.providerOrigin ||
      !["/chat/completions", "/v1/chat/completions"].includes(
        target.pathname,
      ) ||
      target.search ||
      target.hash ||
      target.username ||
      target.password
    )
      throw Error("Unknown comparison provider endpoint");
    if (
      init?.method !== "POST" ||
      typeof init.body !== "string" ||
      Buffer.byteLength(init.body, "utf8") >
        COMPARISON_LIMITS.maximumRequestBytes
    )
      throw Error("Invalid comparison provider request");
    const body: unknown = JSON.parse(init.body);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw Error("Invalid comparison provider body");
    const b = body as Record<string, unknown>;
    const allowed = new Set([
      "model",
      "messages",
      "max_tokens",
      "temperature",
      "top_p",
      "frequency_penalty",
      "presence_penalty",
      "stop",
      "seed",
      "stream",
      "stream_options",
      "tools",
      "tool_choice",
      "thinking",
      "logit_bias",
      "response_format",
      "user",
      "parallel_tool_calls",
      "n",
    ]);
    const tokens = b.max_tokens;
    const limit = COMPARISON_LIMITS.stages[stage];
    if (
      !limit ||
      Object.keys(b).some((k) => !allowed.has(k)) ||
      b.model !== this.pricing.model ||
      !Number.isInteger(tokens) ||
      typeof tokens !== "number" ||
      tokens < 1 ||
      tokens > limit.outputTokens ||
      (b.n !== undefined && b.n !== 1) ||
      JSON.stringify(b.thinking) !== JSON.stringify({ type: "disabled" }) ||
      !Array.isArray(b.messages) ||
      !b.messages.length
    )
      throw Error("Comparison model or token constraints failed");
    if (!(b.messages as unknown[]).every(textMessage))
      throw Error("Comparison supports text-only messages");
    if (
      b.tools !== undefined &&
      (!Array.isArray(b.tools) ||
        (b.tools as unknown[]).some((t) => !record(t) || t.type !== "function"))
    )
      throw Error("Paid provider-side tools are excluded");
    const quota = arm === "baseline" && stage !== "route" ? 0 : limit.calls;
    if (
      this.calls.filter(
        (c) => c.arm === arm && c.turn === turn && c.stage === stage,
      ).length >= quota
    )
      throw Error("Comparison call quota exhausted");
    // Synchronous reservation happens before awaiting transport, so parallel calls
    // cannot oversubscribe. No failure, abort, missing usage or cached response refunds it.
    const call: ComparisonCallReceipt = {
      id: this.calls.length,
      arm,
      turn,
      stage,
      outputTokenLimit: tokens,
      reservedUsd: usd(reservation(this.pricing, limit.outputTokens)),
      outcome: "reserved",
    };
    this.calls.push(call);
    return call.id;
  }
  complete(id: number, outcome: ComparisonCallReceipt["outcome"]) {
    const old = this.calls[id];
    if (old) this.calls[id] = { ...old, outcome };
  }
  recordTrace(arm: ComparisonArm, turn: number, traceId: string | null) {
    if (
      this.turns.get(`${arm}:${turn}`) !== "open" ||
      !traceId ||
      !/^[a-f0-9]{32}$/.test(traceId) ||
      /^0+$/.test(traceId)
    )
      throw Error("Comparison trace ID missing or invalid");
    this.traces.push({ arm, turn, traceId });
  }
  receipt() {
    return {
      runId: this.runId,
      releaseSha: this.releaseSha,
      quote: { ...this.quote },
      pricing: { ...this.pricing },
      calls: this.calls.map((c) => ({ ...c })),
      traces: this.traces.map((t) => ({ ...t })),
      turns: Array.from(this.turns, ([id, state]) => ({ id, state })),
    };
  }
}
