import { ComparisonBudget, type ComparisonArm } from "./comparison-budget";
import { runComparisonTurn } from "./comparison-context";
import { customerAiEverydayKnowledgeEvalCases } from "./evals/customer-eval-everyday-knowledge-cases";
import { customerAiProductEvalCases } from "./evals/customer-eval-product-cases";
import {
  evaluateCustomerAiCase,
  type CustomerAiEvalRunResult,
  type EvaluateCustomerAiCaseOptions,
} from "./evals/customer-eval-runner";

// Reuse existing natural inputs AND strict graders; no rubric is weakened for a trial.
export const comparisonCases = [
  ...customerAiEverydayKnowledgeEvalCases,
  ...customerAiProductEvalCases.filter(
    (c) => c.id === "dragonfly-temperature-follow-up",
  ),
];
const MAX_BYTES = 2_000_000;
type EvalFetch = NonNullable<EvaluateCustomerAiCaseOptions["fetchImpl"]>;
type Receipt = ReturnType<ComparisonBudget["receipt"]>;
async function boundedBody(response: Response, signal: AbortSignal) {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      if (signal.aborted) throw Error("Comparison turn aborted");
      const v = await reader.read();
      if (v.done) break;
      length += v.value.byteLength;
      if (length > MAX_BYTES) throw Error("Comparison response exceeds limit");
      chunks.push(v.value);
    }
  } finally {
    if (signal.aborted || length > MAX_BYTES)
      void reader.cancel().catch(() => undefined);
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
/** Consume the complete answer inside trusted app context, keeping normal Langfuse
 * tracing and the per-turn arm override active through all streamed tool steps.
 * This is not a new HTTP endpoint, connection or executable live operator command.
 */
export function createComparisonEvalFetch(options: {
  budget: ComparisonBudget;
  arm: ComparisonArm;
  endpointUrl: string;
  invokeAssistant: (request: Request) => Promise<Response>;
  onTurn: (receipt: Receipt, traceId: string | null) => Promise<void>;
}): EvalFetch {
  let turn = 0;
  return async (input, init) => {
    if (String(input) !== options.endpointUrl)
      throw Error("Comparison endpoint mismatch");
    const index = turn++;
    return runComparisonTurn(options.budget, options.arm, index, async () => {
      const headers = new Headers(init?.headers);
      headers.set("origin", new URL(options.endpointUrl).origin);
      const request = new Request(options.endpointUrl, { ...init, headers });
      if (request.signal.aborted) throw Error("Comparison turn aborted");
      let onAbort: (() => void) | undefined;
      try {
        const abortPromise = new Promise<never>((_, reject) => {
          onAbort = () => reject(Error("Comparison turn aborted"));
          request.signal.addEventListener("abort", onAbort, { once: true });
          if (request.signal.aborted) onAbort();
        });
        const response = await Promise.race([
          (async () => {
            const raw = await options.invokeAssistant(request);
            const bytes = await boundedBody(raw, request.signal);
            return new Response(bytes, {
              status: raw.status,
              statusText: raw.statusText,
              headers: raw.headers,
            });
          })(),
          abortPromise,
        ]);
        const traceId = response.headers.get("x-3db-langfuse-trace-id");
        options.budget.recordTrace(options.arm, index, traceId);
        await options.onTurn(options.budget.receipt(), traceId);
        return response;
      } finally {
        if (onAbort) request.signal.removeEventListener("abort", onAbort);
      }
    });
  };
}
export async function runGroundedComparison(options: {
  budget: ComparisonBudget;
  origin: string;
  invokeAssistant: (request: Request) => Promise<Response>;
  persistReceipt: (receipt: Receipt) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
}) {
  const turns = comparisonCases.reduce(
    (n, c) => n + (c.customerPrompts?.length ?? 1),
    0,
  );
  if (turns !== 12)
    throw Error(
      "Reviewed comparison must contain exactly twelve turns per arm",
    );
  const endpointUrl = new URL(
    "/api/ai-shopping-assistant",
    options.origin,
  ).toString();
  if (new URL(endpointUrl).protocol !== "https:")
    throw Error("Comparison requires the existing HTTPS storefront origin");
  // Persist the full conservative reservation BEFORE any invocation. Never refund it
  // or automatically resume/restart an interrupted batch as a fresh allowance.
  await options.persistReceipt(options.budget.receipt());
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const results: Array<{
    arm: ComparisonArm;
    result: CustomerAiEvalRunResult;
  }> = [];
  let calls = 0;
  for (const arm of ["baseline", "trial"] as const) {
    const fetchImpl = createComparisonEvalFetch({
      budget: options.budget,
      arm,
      endpointUrl,
      invokeAssistant: options.invokeAssistant,
      onTurn: async (receipt) => options.persistReceipt(receipt),
    });
    for (const evalCase of comparisonCases) {
      const result = await evaluateCustomerAiCase(evalCase, {
        endpointUrl,
        fetchImpl,
        timeoutMs: 60_000,
        beforeRequest: async () => {
          if (calls++) await sleep(6_500);
        },
        traceContext: {
          chatbotId: "storefront.customer-ai-evals",
          surface: "customer-eval-runner",
          sessionId: `${options.budget.runId}-${arm}`,
        },
      });
      results.push({ arm, result });
      // Stop transport/config/trace failures; no "best of" resampling. Ordinary rubric
      // failures remain visible results, not authorization to weaken expectations.
      if (
        result.error ||
        result.status !== 200 ||
        result.diagnostics?.releaseSha !== options.budget.releaseSha ||
        !result.traceId
      )
        throw Error(
          "Comparison stopped: response, release or trace diagnostics incomplete",
        );
    }
  }
  await options.persistReceipt(options.budget.receipt());
  return { results, receipt: options.budget.receipt() };
}
