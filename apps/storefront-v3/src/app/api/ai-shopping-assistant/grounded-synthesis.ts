import { plainMarkdown } from "./grounded-text";
import { assembleKnowledgeAnswer } from "./knowledge-grounding";
import { knowledgeAnswerIntent } from "./knowledge-answer-intent";
import { synthesisEvidence, synthesisSources } from "./synthesis-evidence";
import {
  acceptsReview,
  draftSchema,
  hardCheckDraft,
  reviewSchema,
  REVIEW_RULES,
  SYNTHESIS_RULES,
} from "./synthesis-contract";
import type { KnowledgeExecution } from "./knowledge-execution";

export type SynthesisCall = (request: {
  stage: "draft" | "review" | "repair";
  system: string;
  payload: string;
  signal: AbortSignal;
  maxOutputTokens: number;
}) => Promise<{ text: string; inputTokens?: number; outputTokens?: number }>;
export type SynthesisOutcome = {
  reason: string;
  calls: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
};
export type SynthesisOptions = {
  execution: KnowledgeExecution;
  question: string;
  previousQuestion?: string;
  subject?: string;
  call: SynthesisCall;
  tone?: string;
  signal?: AbortSignal;
  now?: () => number;
  callTimeoutMs?: number;
  totalTimeoutMs?: number;
  onOutcome?: (outcome: SynthesisOutcome) => void;
};
export function isSynthesisEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED === "true";
}
/** Buffer -> hard checks -> independent grounding review -> one style repair at most.
 * Same-model review can share errors with generation. This experimental path does
 * not guarantee entailment; critical operational advice remains on the composer.
 */
export async function synthesizeKnowledgeAnswer(options: SynthesisOptions) {
  const now = options.now ?? Date.now;
  const started = Date.now();
  const metrics: SynthesisOutcome = {
    reason: "ineligible",
    calls: 0,
    durationMs: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
  const fallback = () => ({
    ...assembleKnowledgeAnswer(
      options.execution,
      options.question,
      now(),
      options.subject,
      options.previousQuestion,
    ),
    origin: "validated_claim_composer" as const,
  });
  const finish = <T>(value: T, reason: string) => {
    try {
      options.onOutcome?.({
        ...metrics,
        reason,
        durationMs: Date.now() - started,
      });
    } catch {
      /* Telemetry must not change the validated customer answer. */
    }
    return value;
  };
  const packet = synthesisEvidence(options.execution, now());
  // No extra processing for commerce/account/PII or consequential operational advice.
  // This conservative trial boundary can exclude benign wording; it is not a safety classifier.
  if (
    !packet ||
    options.signal?.aborted ||
    /\b(?:order|tracking|shipping|ticket|account|password|address|phone|volts?|amps?|wiring|heater|sensor|firmware|degrees?|celsius|temperature|hotter|maximum|heat|rating)\b|@|°\s*[cf]/i.test(
      `${options.previousQuestion ?? ""} ${options.question}`,
    )
  )
    return finish(fallback(), "ineligible");
  const fingerprint = JSON.stringify(packet);
  const payload = {
    question: options.question,
    intent: knowledgeAnswerIntent(options.question, options.previousQuestion),
    evidence: packet,
  };
  const invoke = async (
    stage: "draft" | "review" | "repair",
    extra: object = {},
  ) => {
    if (options.signal?.aborted) throw new Error("cancelled");
    const remaining =
      (options.totalTimeoutMs ?? 30_000) - (Date.now() - started);
    if (remaining <= 0) throw new Error("timeout");
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      metrics.calls++;
      const response = await Promise.race([
        options.call({
          stage,
          system:
            stage === "review"
              ? REVIEW_RULES
              : [options.tone?.slice(0, 4000), SYNTHESIS_RULES]
                  .filter(Boolean)
                  .join("\n\n"),
          payload: JSON.stringify({ ...payload, ...extra }),
          signal: controller.signal,
          maxOutputTokens: stage === "review" ? 600 : 700,
        }),
        new Promise<never>((_, reject) => {
          const fail = () => reject(new Error("cancelled"));
          controller.signal.addEventListener("abort", fail, { once: true });
          timer = setTimeout(
            () => {
              controller.abort();
              reject(new Error("timeout"));
            },
            Math.min(options.callTimeoutMs ?? 10_000, remaining),
          );
        }),
      ]);
      metrics.inputTokens += response.inputTokens ?? 0;
      metrics.outputTokens += response.outputTokens ?? 0;
      if (response.text.length > 12_000) throw new Error("response_limit");
      return JSON.parse(response.text) as unknown;
    } finally {
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      controller.abort();
    }
  };
  try {
    let candidate = await invoke("draft");
    for (let attempt = 0; attempt < 2; attempt++) {
      const parsed = draftSchema.safeParse(candidate);
      if (!parsed.success || !hardCheckDraft(parsed.data, packet))
        return finish(fallback(), "hard_check_failed");
      const review = reviewSchema.safeParse(
        await invoke("review", { draft: parsed.data }),
      );
      if (!review.success) return finish(fallback(), "invalid_review");
      if (acceptsReview(review.data, parsed.data)) {
        if (
          options.signal?.aborted ||
          JSON.stringify(synthesisEvidence(options.execution, now())) !==
            fingerprint
        )
          return finish(fallback(), "evidence_changed");
        const text = parsed.data.segments
          .map((s) =>
            s.text.replaceAll(
              "{{product}}",
              plainMarkdown(packet.product.title),
            ),
          )
          .join("\n\n");
        const sources = synthesisSources(
          packet,
          parsed.data.segments.flatMap((s) => s.evidenceIds),
        );
        return finish(
          { text, sources, origin: "reviewed_llm_synthesis" as const },
          "accepted",
        );
      }
      const styleOnly =
        review.data.findings.length &&
        review.data.findings.every((f) =>
          ["not_customer_focused", "repetition"].includes(f),
        );
      if (attempt || review.data.verdict !== "repair" || !styleOnly)
        return finish(fallback(), "review_rejected");
      candidate = await invoke("repair", {
        draft: parsed.data,
        findings: review.data.findings,
      });
    }
  } catch {
    return finish(fallback(), "call_failed");
  }
  return finish(fallback(), "review_rejected");
}
