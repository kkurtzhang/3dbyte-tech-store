import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
  startActiveLangfuseTraceObservation,
  propagateActiveLangfuseTraceAttributes,
  updateActiveLangfuseTraceIO,
  isAiTelemetryEnabled,
} from "@3dbyte-tech-store/observability";
import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url";
import { getReleaseSha } from "@/lib/release-identity";
import {
  ComparisonBudget,
  COMPOSITION_PILOT_PLAN,
  type ComparisonPricing,
} from "./comparison-budget";
import {
  comparisonFetch,
  comparisonMetadata,
  withComparisonStage,
} from "./comparison-context";
import {
  runCompositionPilot,
  type PilotCaseContext,
  type PilotReport,
} from "./composition-pilot";
import { createKnowledgeExecution } from "./knowledge-execution";
import { createProductSearchExecution } from "./product-search-execution";
import { resolveAssistantSystemPrompt } from "./prompt-management";
import { KNOWLEDGE_ANSWER_POLICY_VERSION } from "./knowledge-answer-intent";
import {
  SYNTHESIS_PROMPT_VERSION,
  SYNTHESIS_VALIDATOR_VERSION,
} from "./synthesis-contract";
import type { SynthesisCall } from "./grounded-synthesis";
import type { GroundedAnswer } from "./knowledge-grounding";

export type PilotRequest = {
  runId: string;
  releaseSha: string;
  pricing: ComparisonPricing;
  scope: "composition-only-three-cases-six-calls";
};
export type RuntimePilotReport = PilotReport & {
  usage: Array<{
    stage: string;
    inputTokens: number;
    outputTokens: number;
    usage: unknown;
    responseModelId?: string;
    providerResponseId?: string;
    peakCostUpperUsd: number;
  }>;
  fatalReason?: string;
  observations?: Array<{
    caseId: string;
    arm: string;
    traceId: string;
    answer: GroundedAnswer;
    ingestionVerified: boolean;
    errorCode?: string;
  }>;
};
export function pilotTraceIOMatches(
  input: unknown,
  output: unknown,
  question: string,
  answer: GroundedAnswer,
) {
  const decode = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  };
  const parsed = decode(output);
  if (input !== question && decode(input) !== question) return false;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("text" in parsed) ||
    parsed.text !== answer.text ||
    !("sources" in parsed) ||
    !Array.isArray(parsed.sources) ||
    parsed.sources.length !== answer.sources.length
  )
    return false;
  return answer.sources.every((source, index) => {
    const stored = (parsed as { sources: Array<Record<string, unknown>> })
      .sources[index];
    return (
      stored &&
      Object.entries(source).every(([key, value]) => stored[key] === value)
    );
  });
}
/** Runs only in the existing staging process; never initializes tracing or changes env. */
export async function runStagingCompositionPilot(
  request: PilotRequest,
  io: {
    persist: (r: RuntimePilotReport) => Promise<void>;
    reserve: (receipt: unknown) => void;
  },
) {
  const env = process.env;
  if (
    env.APP_ENV !== "staging" ||
    env.AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED === "true" ||
    env.AI_ASSISTANT_LOCAL_KNOWLEDGE === "1" ||
    getReleaseSha() !== request.releaseSha ||
    !isAiTelemetryEnabled()
  )
    throw Error("pilot_runtime_not_ready");
  const apiKey = env.DEEPSEEK_API_KEY,
    internalToken = env.INTERNAL_API_TOKEN,
    host = env.LANGFUSE_HOST,
    publicKey = env.LANGFUSE_PUBLIC_KEY,
    secretKey = env.LANGFUSE_SECRET_KEY;
  const baseURL = (env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(
    /\/$/,
    "",
  );
  if (
    (env.AI_PROVIDER || "deepseek") !== "deepseek" ||
    (env.AI_MODEL || "deepseek-flash") !== request.pricing.model ||
    !["https://api.deepseek.com", "https://api.deepseek.com/v1"].includes(
      baseURL,
    ) ||
    !apiKey ||
    !internalToken ||
    !host ||
    !publicKey ||
    !secretKey
  )
    throw Error("pilot_configuration_unavailable");
  const backendUrl = resolveMedusaBaseUrl({ isServer: true });
  if (!backendUrl) throw Error("pilot_backend_unavailable");
  const prompt = await resolveAssistantSystemPrompt();
  const usage: RuntimePilotReport["usage"] = [];
  const observations: NonNullable<RuntimePilotReport["observations"]> = [];
  let fatalReason: string | undefined;
  let budget: ComparisonBudget;
  budget = new ComparisonBudget({
    ...request,
    plan: COMPOSITION_PILOT_PLAN,
    onReserve: () => io.reserve(budget.receipt()),
  });
  const guarded = comparisonFetch(fetch);
  const provider = createOpenAI({
    apiKey,
    baseURL,
    name: "deepseek",
    fetch: async (input, init) => {
      if (typeof init?.body !== "string")
        throw Error("pilot_request_body_invalid");
      const body = JSON.parse(init.body) as Record<string, unknown>;
      return guarded(input, {
        ...init,
        body: JSON.stringify({ ...body, thinking: { type: "disabled" } }),
      });
    },
  }).chat(request.pricing.model);
  const call: SynthesisCall = async (r) =>
    withComparisonStage(r.stage, async () => {
      try {
        const result = await generateText({
          model: provider,
          system: r.system,
          prompt: r.payload,
          abortSignal: r.signal,
          maxRetries: 0,
          maxOutputTokens: r.maxOutputTokens,
          temperature: 0.2,
          experimental_telemetry: {
            isEnabled: true,
            functionId: `storefront.ai-shopping-assistant.synthesis.${r.stage}`,
            recordInputs: false,
            recordOutputs: false,
            metadata: {
              ...comparisonMetadata(),
              synthesis_prompt_version: SYNTHESIS_PROMPT_VERSION,
              synthesis_validator_version: SYNTHESIS_VALIDATOR_VERSION,
            },
          },
        });
        const inputTokens = result.totalUsage.inputTokens,
          outputTokens = result.totalUsage.outputTokens;
        if (
          typeof inputTokens !== "number" ||
          !Number.isInteger(inputTokens) ||
          inputTokens < 0 ||
          typeof outputTokens !== "number" ||
          !Number.isInteger(outputTokens) ||
          outputTokens < 0 ||
          inputTokens > request.pricing.contextTokens ||
          outputTokens > r.maxOutputTokens
        )
          throw Error("pilot_usage_invalid");
        usage.push({
          stage: r.stage,
          inputTokens,
          outputTokens,
          usage: result.totalUsage,
          responseModelId: result.response?.modelId,
          providerResponseId: result.response?.id,
          peakCostUpperUsd:
            (inputTokens * Number(request.pricing.inputUsdPerMillion) +
              outputTokens * Number(request.pricing.outputUsdPerMillion)) /
            1_000_000,
        });
        return { text: result.text, inputTokens, outputTokens };
      } catch {
        fatalReason = "provider_attempt_or_usage_failed";
        throw Error(fatalReason);
      }
    });
  const authorization = `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}`;
  const verify = async (
    traceId: string,
    c: PilotCaseContext,
    arm: string,
    answer: GroundedAnswer,
  ) => {
    const endpoint = `${host.replace(/\/$/, "")}/api/public/traces/${encodeURIComponent(traceId)}`;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const response = await fetch(endpoint, {
        headers: { authorization },
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      });
      if (response.ok) {
        const trace = (await response.json()) as {
          id?: string;
          projectId?: string;
          input?: unknown;
          output?: unknown;
          metadata?: Record<string, unknown>;
          htmlPath?: string;
        };
        const meta = trace.metadata;
        if (
          trace.id === traceId &&
          meta?.pilot_run_id === request.runId &&
          meta?.pilot_case_id === c.id &&
          meta?.pilot_arm === arm &&
          meta?.release_sha === request.releaseSha &&
          meta?.evidence_hash === c.evidenceHash &&
          trace.projectId === "estore" &&
          pilotTraceIOMatches(trace.input, trace.output, c.question, answer)
        )
          return {
            verified: true,
            url: trace.htmlPath
              ? new URL(
                  new URL(trace.htmlPath, "https://observe.3dbytetech.com.au")
                    .pathname +
                    new URL(trace.htmlPath, "https://observe.3dbytetech.com.au")
                      .search,
                  "https://observe.3dbytetech.com.au",
                ).toString()
              : undefined,
            projectId: trace.projectId,
          };
      } else if (response.status !== 404)
        throw Error("pilot_trace_api_unavailable");
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    throw Error("pilot_trace_ingestion_unverified");
  };
  return runCompositionPilot({
    budget,
    tone: prompt.editableTone,
    call,
    fatalReason: () => fatalReason,
    loadEvidence: async (c) => {
      const product = createProductSearchExecution({
        backendUrl,
        internalToken,
        storefrontOrigin:
          env.NEXT_PUBLIC_SITE_URL || "https://store.staging.3dbytetech.com.au",
        lookupAllowed: true,
        signal: AbortSignal.timeout(15_000),
      });
      await product.execute(
        { query: c.productQuery },
        { toolCallId: `${c.id}-identity` },
      );
      const ids = Array.from(
        new Set(
          Array.from(product.scopeCandidates.values())
            .filter((p) => p.direct)
            .map((p) => p.id),
        ),
      );
      if (ids.length !== 1) throw Error("pilot_product_identity_ambiguous");
      const knowledge = createKnowledgeExecution(async (input) => {
        const response = await fetch(`${backendUrl}/ai/knowledge-search`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-3db-internal-token": internalToken,
          },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(15_000),
        });
        return response.ok ? response.json() : null;
      });
      await knowledge.execute(
        { query: c.productQuery, product_id: ids[0] },
        { toolCallId: `${c.id}-evidence` },
      );
      return knowledge;
    },
    observe: async (c, arm, fn) => {
      const metadata = {
        ...prompt.metadata,
        pilot_run_id: request.runId,
        pilot_case_id: c.id,
        pilot_arm: arm,
        pilot_scope: "composition-only",
        release_sha: request.releaseSha,
        evidence_hash: c.evidenceHash,
        chatbot_id: "storefront.customer-ai-evals",
        surface: "composition-pilot",
        answer_policy_version: KNOWLEDGE_ANSWER_POLICY_VERSION,
        synthesis_prompt_version: SYNTHESIS_PROMPT_VERSION,
        synthesis_validator_version: SYNTHESIS_VALIDATOR_VERSION,
        ...comparisonMetadata(),
      };
      const observed = await propagateActiveLangfuseTraceAttributes(
        {
          name: "storefront.ai-shopping-assistant.composition-pilot",
          sessionId: request.runId,
          metadata,
          tags: ["composition-pilot", arm],
        },
        () =>
          startActiveLangfuseTraceObservation(
            "storefront.ai-shopping-assistant.composition-pilot",
            async (span) => {
              updateActiveLangfuseTraceIO({ input: c.question });
              span.update({ metadata });
              try {
                const answer = await fn();
                updateActiveLangfuseTraceIO({
                  output: { text: answer.text, sources: answer.sources },
                });
                span.update({
                  metadata: { ...metadata, answer_origin: answer.origin },
                });
                return { answer, traceId: span.traceId };
              } finally {
                span.end();
              }
            },
          ),
      );
      if (
        !observed.traceId ||
        !/^([a-f0-9]{32})$/.test(observed.traceId) ||
        /^0+$/.test(observed.traceId)
      )
        throw Error("pilot_trace_id_missing");
      const attempt = {
        caseId: c.id,
        arm,
        traceId: observed.traceId,
        answer: observed.answer,
        ingestionVerified: false,
        errorCode: undefined as string | undefined,
      };
      observations.push(attempt);
      let verification;
      try {
        verification = await verify(observed.traceId, c, arm, observed.answer);
        attempt.ingestionVerified = true;
      } catch {
        attempt.errorCode = "pilot_trace_ingestion_unverified";
        throw Error("pilot_trace_ingestion_unverified");
      }
      return {
        ...observed,
        traceId: observed.traceId,
        ingestionVerified: verification.verified,
        url: verification.url,
      };
    },
    persist: async (report) =>
      io.persist({
        ...report,
        usage: [...usage],
        observations: observations.map((o) => ({ ...o })),
        ...(fatalReason ? { fatalReason } : {}),
      }),
  });
}
