import { createHash } from "node:crypto";

export const SYNTHESIS_DIAGNOSTICS_VERSION =
  "2026-11-02.validation-diagnostics-1";
export type CandidateIdentity = { sha256: string; utf8Bytes: number };
export type HardFailureCode =
  | "answer_length_limit"
  | "question_limit"
  | "thermal_or_electrical_advice"
  | "unknown_evidence_id"
  | "duplicate_evidence_id"
  | "fact_without_evidence"
  | "missing_product_placeholder"
  | "only_unknown_evidence"
  | "forbidden_markup_or_citation"
  | "unsupported_quantity"
  | "unsupported_material_scope"
  | "unsupported_surface_scope";
export type HardCheckResult =
  | { ok: true }
  | { ok: false; code: HardFailureCode; segmentIndex?: number };
export type SafeSchemaIssue = { code: string; path: Array<string | number> };
export type ValidationFailure = {
  phase: "schema" | "hard" | "parse";
  code: HardFailureCode | "schema_invalid" | "json_invalid" | "response_limit";
  segmentIndex?: number;
  issues?: SafeSchemaIssue[];
};
export function candidateIdentity(raw: string): CandidateIdentity {
  return {
    sha256: createHash("sha256").update(raw, "utf8").digest("hex"),
    utf8Bytes: Buffer.byteLength(raw, "utf8"),
  };
}
const schemaFields = new Set([
  "segments",
  "kind",
  "text",
  "productKey",
  "evidenceIds",
]);
/** Never include issue messages, received values or unknown JSON property names. */
export function schemaFailure(
  issues: readonly { code: string; path: readonly PropertyKey[] }[],
): ValidationFailure {
  const safe = issues.slice(0, 8).map((issue) => ({
    code: issue.code.slice(0, 48),
    path: issue.path
      .slice(0, 4)
      .map((part) =>
        typeof part === "number" &&
        Number.isInteger(part) &&
        part >= 0 &&
        part <= 30
          ? part
          : typeof part === "string" && schemaFields.has(part)
            ? part
            : "other",
      ),
  }));
  const first = safe[0]?.path;
  const segmentIndex =
    first?.[0] === "segments" && typeof first[1] === "number" && first[1] <= 5
      ? first[1]
      : undefined;
  return {
    phase: "schema",
    code: "schema_invalid",
    ...(segmentIndex === undefined ? {} : { segmentIndex }),
    issues: safe,
  };
}

/** Closed, text-free metadata. Never spread a candidate or a Zod issue into telemetry. */
export function synthesisDiagnosticMetadata(outcome?: {
  diagnosticsVersion?: string;
  candidate?: CandidateIdentity;
  failure?: ValidationFailure;
}): Record<string, string | number> {
  if (!outcome) return {};
  return {
    synthesis_diagnostics_version: SYNTHESIS_DIAGNOSTICS_VERSION,
    ...(outcome.candidate
      ? {
          synthesis_candidate_sha256: outcome.candidate.sha256,
          synthesis_candidate_utf8_bytes: outcome.candidate.utf8Bytes,
        }
      : {}),
    ...(outcome.failure
      ? {
          synthesis_failure_phase: outcome.failure.phase,
          synthesis_failure_code: outcome.failure.code,
          ...(outcome.failure.segmentIndex === undefined
            ? {}
            : {
                synthesis_failure_segment_index: outcome.failure.segmentIndex,
              }),
          ...(outcome.failure.issues
            ? {
                synthesis_schema_issues: JSON.stringify(outcome.failure.issues),
              }
            : {}),
        }
      : {}),
  };
}
