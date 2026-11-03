import { knowledgeAnswerIntent } from "./knowledge-answer-intent";
import { parseKnowledgeClaim } from "./knowledge-claim-presentation";
import type { SynthesisPacket, SynthesisFact } from "./synthesis-evidence";
import type { HardFailureCode } from "./synthesis-diagnostics";

export type SynthesisRequestContext = {
  question: string;
  previousQuestion?: string;
};
/** Bounded non-procedural next steps, not an authorisation to apply/test a product. */
export const SYNTHESIS_SAFE_NEXT_STEPS = [
  "Check the adhesive and plate manufacturers' compatibility guidance before applying it.",
  "Check the product and equipment manufacturers' compatibility guidance before use.",
  "Check the manufacturer's application instructions for your material and build surface.",
  "Which build plate are you using?",
  "What material are you printing?",
] as const;
const instructionFields = new Set([
  "application_instructions",
  "surface_test_instructions",
]);
function scanText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u200b-\u200d\ufeff]/g, "")
    .toLowerCase();
}
/** Conservative English-language action/risk families, not a semantic classifier.
 * Unknown use scopes and all free guidance have independent fail-closed gates.
 */
export function hasProcedureLanguage(text: string) {
  const scan = scanText(text);
  return (
    /\b(?:apply|applies|applying|application|spread|spreading|dab|dabbing|coat|coats|coating|layers?|dose|dosage|amount|wipe|wiping|clean|cleaning|rinse|rinsing|wash|washing|sand|sanding|scrape|scraping|scratch|scratching|rub|rubbing|spray|spraying|paint|painting|brush|brushing|drop|put|place|placing|deposit|smear|smearing|treat|treating|test|testing|trial|try|trying|experiment|experimenting|assess|probe|patch|spot|inconspicuous|harmless|safe|safely)\b/.test(
      scan,
    ) ||
    /\b(?:can|could|may|might|should|would|must)\b[\s\S]*\b(?:applied|spread|coated|wiped|cleaned|rinsed|washed|rubbed|sprayed|painted|brushed|placed|tested|tried|assessed)\b/.test(
      scan,
    ) ||
    /(?:^|[.!;:])\s*(?:you\s+)?use\b/.test(scan) ||
    /\b(?:low[- ]risk|risk[- ]free|damage[- ]free|won't (?:hurt|damage)|will not (?:hurt|damage)|tiny amount|hidden corner)\b/.test(
      scan,
    )
  );
}
/** v1 intentionally recognises only an explicit single material/surface scope.
 * The complete reviewed value is preserved, including every body qualification.
 * A marketing claim, source body or a null field cannot become instructions.
 */
function procedureScope(fact: SynthesisFact) {
  if (
    !instructionFields.has(fact.fact.field) ||
    !fact.fact.value ||
    !fact.fact.evidence_excerpt.trim()
  )
    return undefined;
  const scope = fact.fact.value.match(
    /^For ([A-Z0-9][A-Z0-9+-]{0,20}) on (glass|smooth PEI|textured PEI|PEI) only: (.+)$/,
  );
  if (!scope) return undefined;
  const named = knowledgeAnswerIntent(fact.fact.value);
  // Do not transfer a complete instruction that also mentions another recognised
  // material/surface. Keep qualifications intact; reject rather than cut them.
  if (
    named.materials.some((m) => m !== scope[1]) ||
    named.surfaces.some((v) => v.toLowerCase() !== scope[2].toLowerCase()) ||
    /\b(?:temperature|volts?|amps?|wiring|heater|sensor|firmware|heat|maximum)\b/i.test(
      fact.fact.value,
    )
  )
    return undefined;
  return { material: scope[1], surface: scope[2] };
}
function scopeMatches(
  fact: SynthesisFact,
  context: SynthesisRequestContext | undefined,
  packet: SynthesisPacket,
) {
  if (
    !context ||
    ![
      "official_product_page",
      "official_manual",
      "official_datasheet",
      "official_safety_sheet",
    ].includes(
      packet.documents.find((d) => d.document_id === fact.documentId)
        ?.source_kind ?? "",
    )
  )
    return false;
  const scope = procedureScope(fact);
  const intent = knowledgeAnswerIntent(
    context.question,
    context.previousQuestion,
  );
  return Boolean(
    scope &&
      !intent.qualifiedSurface &&
      intent.materials.length === 1 &&
      intent.surfaces.length === 1 &&
      intent.materials[0] === scope.material &&
      intent.surfaces[0].toLowerCase() === scope.surface.toLowerCase(),
  );
}
function requestsProcedure(context: SynthesisRequestContext) {
  return (
    knowledgeAnswerIntent(context.question, context.previousQuestion).kind ===
      "application" || hasProcedureLanguage(context.question)
  );
}
/** Deterministic composer handles unsupported/qualified use scopes and missing
 * instructions before generation, so paraphrasing the model's answer cannot
 * bypass those boundaries. Scope recognition is deliberately bounded.
 */
export function requiresProcedureFallback(
  packet: SynthesisPacket,
  context: SynthesisRequestContext,
) {
  const intent = knowledgeAnswerIntent(
    context.question,
    context.previousQuestion,
  );
  if (intent.materials.length || intent.surfaces.length) {
    const claims = packet.facts.flatMap((f) => {
      const doc = packet.documents.find((d) => d.document_id === f.documentId)!;
      const claim = parseKnowledgeClaim(doc, f.fact);
      return claim?.kind === "materials" ? [claim] : [];
    });
    if (
      intent.qualifiedSurface ||
      !claims.some(
        (c) =>
          intent.materials.every((m) =>
            c.materials?.some((v) => v.toUpperCase() === m),
          ) &&
          intent.surfaces.every(
            (s) => c.surface?.toLowerCase() === s.toLowerCase(),
          ),
      )
    )
      return true;
  }
  return (
    requestsProcedure(context) &&
    !packet.facts.some((f) => scopeMatches(f, context, packet))
  );
}
export function procedureFailure(
  segment: { kind: string; text: string; evidenceIds: readonly string[] },
  packet: SynthesisPacket,
  context?: SynthesisRequestContext,
): HardFailureCode | undefined {
  if (SYNTHESIS_SAFE_NEXT_STEPS.some((text) => text === segment.text))
    return undefined;
  const instructionRefs = packet.facts.filter(
    (f) =>
      segment.evidenceIds.includes(f.id) && instructionFields.has(f.fact.field),
  );
  if (instructionRefs.length) {
    const fact = instructionRefs[0];
    if (
      !scopeMatches(fact, context, packet) ||
      !context ||
      !requestsProcedure(context)
    )
      return "instruction_scope_unverified";
    if (
      segment.kind !== "fact" ||
      instructionRefs.length !== 1 ||
      segment.evidenceIds.length !== 1 ||
      segment.text !== `{{product}}: ${fact.fact.value}`
    )
      return "instruction_contract_mismatch";
    return undefined;
  }
  if (hasProcedureLanguage(segment.text))
    return "procedure_without_approved_instructions";
  if (segment.kind === "guidance") return "unbounded_guidance";
  return undefined;
}
