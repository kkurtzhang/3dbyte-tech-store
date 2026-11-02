import {
  candidateIdentity,
  type CandidateIdentity,
} from "./synthesis-diagnostics";

export type PilotDiagnosticsOptIn = {
  captureRejectedDrafts: "synthetic-pilot-only";
};
export const PILOT_DRAFT_CAPTURE_BYTES = 4096;
export type SyntheticRejectedDraft = CandidateIdentity & {
  synthetic: true;
  stage: "draft";
  text?: string;
  omittedReason?: "byte_limit";
};
/** Private fixed-case pilot receipts only. Callers must explicitly opt in; never telemetry. */
export function captureSyntheticPilotDraft(
  raw: string,
): SyntheticRejectedDraft {
  const identity = candidateIdentity(raw);
  return {
    ...identity,
    synthetic: true,
    stage: "draft",
    ...(identity.utf8Bytes <= PILOT_DRAFT_CAPTURE_BYTES
      ? { text: raw }
      : { omittedReason: "byte_limit" as const }),
  };
}
