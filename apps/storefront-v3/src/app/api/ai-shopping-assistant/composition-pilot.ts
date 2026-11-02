import { createHash } from "node:crypto";
import {
  ComparisonBudget,
  COMPOSITION_PILOT_PLAN,
  type ComparisonArm,
} from "./comparison-budget";
import { runComparisonTurn } from "./comparison-context";
import {
  assembleKnowledgeAnswer,
  type GroundedAnswer,
} from "./knowledge-grounding";
import {
  synthesizeKnowledgeAnswer,
  type SynthesisCall,
  type SynthesisOutcome,
} from "./grounded-synthesis";
import { synthesisEvidence } from "./synthesis-evidence";
import {
  captureSyntheticPilotDraft,
  type PilotDiagnosticsOptIn,
  type SyntheticRejectedDraft,
} from "./pilot-draft-capture";
import type { KnowledgeExecution } from "./knowledge-execution";
export const COMPOSITION_PILOT_CASES = [
  {
    id: "magigoo-petg-glass",
    productQuery: "Magigoo Original",
    question: "I'm printing PETG on glass. Is Magigoo Original suitable?",
  },
  {
    id: "dragonfly-construction",
    productQuery: "Dragonfly BMS",
    question: "What is the Dragonfly BMS made from?",
  },
  {
    id: "magigoo-pei-unknown",
    productQuery: "Magigoo Original",
    question: "Will Magigoo Original work on textured PEI?",
  },
] as const;
export type PilotCase = (typeof COMPOSITION_PILOT_CASES)[number];
export type PilotCaseContext = PilotCase & {
  evidenceHash: string;
  evidence: ReturnType<typeof synthesisEvidence>;
};
export type ObservedPilotAnswer = {
  answer: GroundedAnswer;
  traceId: string;
  ingestionVerified: boolean;
  url?: string;
};
type CaseResult = {
  id: string;
  question: string;
  evidenceHash?: string;
  evidence?: ReturnType<typeof synthesisEvidence>;
  sameEvidence: boolean;
  baseline?: ObservedPilotAnswer;
  trial?: ObservedPilotAnswer;
  outcome?: SynthesisOutcome;
  rejectedDraft?: SyntheticRejectedDraft;
  status: string;
  errorCode?: string;
};
export type PilotReport = {
  scope: "composition-only";
  runId: string;
  releaseSha: string;
  cases: CaseResult[];
  status: string;
  budget: ReturnType<ComparisonBudget["receipt"]>;
};
const fingerprint = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
export async function runCompositionPilot(options: {
  budget: ComparisonBudget;
  now?: () => number;
  call: SynthesisCall;
  tone?: string;
  diagnostics?: PilotDiagnosticsOptIn;
  onOutcome?: (context: PilotCaseContext, outcome: SynthesisOutcome) => void;
  loadEvidence: (c: PilotCase) => Promise<KnowledgeExecution>;
  observe: (
    c: PilotCaseContext,
    arm: ComparisonArm,
    fn: () => Promise<GroundedAnswer>,
  ) => Promise<ObservedPilotAnswer>;
  persist: (report: PilotReport) => Promise<void>;
  fatalReason?: () => string | undefined;
}) {
  if (options.budget.plan.name !== COMPOSITION_PILOT_PLAN.name)
    throw Error("Incorrect pilot plan");
  const now = options.now ?? Date.now;
  const report: PilotReport = {
    scope: "composition-only",
    runId: options.budget.runId,
    releaseSha: options.budget.releaseSha,
    cases: [],
    status: "reserved",
    budget: options.budget.receipt(),
  };
  const save = async () => {
    report.budget = options.budget.receipt();
    await options.persist(report);
  };
  await save();
  for (let index = 0; index < COMPOSITION_PILOT_CASES.length; index++) {
    const c = COMPOSITION_PILOT_CASES[index];
    const result: CaseResult = {
      id: c.id,
      question: c.question,
      sameEvidence: false,
      status: "preparing",
    };
    report.cases.push(result);
    let capturedDraft: SyntheticRejectedDraft | undefined;
    try {
      const execution = await options.loadEvidence(c);
      const packet = synthesisEvidence(execution, now());
      const hash = fingerprint(packet);
      Object.assign(result, { evidenceHash: hash, evidence: packet });
      const context = { ...c, evidenceHash: hash, evidence: packet };
      result.baseline = await runComparisonTurn(
        options.budget,
        "baseline",
        index,
        async () => {
          const observation = await options.observe(
            context,
            "baseline",
            async () => ({
              ...assembleKnowledgeAnswer(execution, c.question, now()),
              origin: "validated_claim_composer",
            }),
          );
          if (!observation.ingestionVerified)
            throw Error("baseline_trace_unverified");
          options.budget.recordTrace("baseline", index, observation.traceId);
          return observation;
        },
      );
      if (
        !packet ||
        fingerprint(synthesisEvidence(execution, now())) !== hash
      ) {
        result.status = "evidence_ineligible";
        await save();
        continue;
      }
      result.trial = await runComparisonTurn(
        options.budget,
        "trial",
        index,
        async () => {
          const observation = await options.observe(context, "trial", () =>
            synthesizeKnowledgeAnswer({
              execution,
              question: c.question,
              tone: options.tone,
              call: async (request) => {
                const response = await options.call(request);
                if (
                  options.diagnostics?.captureRejectedDrafts ===
                    "synthetic-pilot-only" &&
                  request.stage === "draft"
                )
                  capturedDraft = captureSyntheticPilotDraft(response.text);
                return response;
              },
              now,
              maxRepairs: 0,
              onOutcome: (o) => {
                result.outcome = o;
                if (
                  capturedDraft &&
                  o.reason !== "accepted" &&
                  o.reason !== "ineligible" &&
                  o.candidate?.sha256 === capturedDraft.sha256
                )
                  result.rejectedDraft = capturedDraft;
                options.onOutcome?.(context, o);
              },
            }),
          );
          if (!observation.ingestionVerified)
            throw Error("trial_trace_unverified");
          options.budget.recordTrace("trial", index, observation.traceId);
          return observation;
        },
      );
      result.sameEvidence =
        fingerprint(synthesisEvidence(execution, now())) === hash;
      result.status =
        result.sameEvidence &&
        result.trial.answer.origin === "reviewed_llm_synthesis"
          ? "synthesis_accepted"
          : result.sameEvidence
            ? "synthesis_failed_fallback"
            : "evidence_changed";
      await save();
      if (options.fatalReason?.()) {
        report.status = "stopped_provider_failure";
        await save();
        return report;
      }
    } catch (error) {
      result.errorCode =
        error instanceof Error &&
        /^(pilot_[a-z_]+|baseline_trace_unverified|trial_trace_unverified)$/.test(
          error.message,
        )
          ? error.message
          : "pilot_case_failed";
      result.status = "stopped_unverified_or_incomplete";
      report.status = "stopped";
      await save();
      return report;
    }
  }
  report.status = "completed";
  await save();
  return report;
}
