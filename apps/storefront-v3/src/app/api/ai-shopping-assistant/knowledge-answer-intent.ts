/** Customer text identifies the question, never establishes a product capability. */
export const KNOWLEDGE_ANSWER_POLICY_VERSION = "2026-10-29.customer-intent-2";
export type KnowledgeAnswerIntent = {
  kind:
    | "material_use"
    | "print_settings"
    | "release_behavior"
    | "application"
    | "fit"
    | "other";
  materials: string[];
  surfaces: string[];
  qualifiedSurface: boolean;
};
const materialNames = new Set([
  "PLA",
  "ABS",
  "PETG",
  "HIPS",
  "TPU",
  "ASA",
  "NYLON",
  "PA",
  "PC",
  "PVA",
  "PLA-CF",
  "PETG-CF",
  "PA-CF",
  "PLA+",
  "ABS+",
  "PCTG",
  "PA6",
  "PA12",
  "PEEK",
  "PEKK",
  "PPS",
]);
function materialsIn(question: string) {
  return Array.from(
    new Set(
      (question.match(/\b[a-z0-9]+(?:[-+][a-z0-9]*)*/gi) ?? [])
        .map((word) => word.toUpperCase())
        .filter((word) => materialNames.has(word)),
    ),
  );
}
function surfacesIn(question: string) {
  return Array.from(
    new Set(
      question.match(
        /\b(?:textured\s+PEI|smooth\s+PEI|PEI|glass|G10|garolite|BuildTak)\b/gi,
      ) ?? [],
    ),
  );
}
export function knowledgeAnswerIntent(
  question: string,
  previousQuestion = "",
): KnowledgeAnswerIntent {
  const materials = materialsIn(question);
  const currentSurfaces = surfacesIn(question);
  const followup =
    /^(?:and\s+)?(?:what|how) about\b|\b(?:it|this|that)\b/i.test(question);
  const surfaces = currentSurfaces.length
    ? currentSurfaces
    : followup
      ? surfacesIn(previousQuestion)
      : [];
  const result: KnowledgeAnswerIntent = {
    kind: "other",
    materials,
    surfaces,
    qualifiedSurface:
      /\b(?:not|without|instead|except|coated|coating|tape|film)\b/i.test(
        currentSurfaces.length || !followup
          ? question
          : `${previousQuestion} ${question}`,
      ),
  };
  const compoundInventory =
    /\b(?:all|every|full|complete|unknowns?)\b|\b(?:and|plus|also)\b.*\b(?:what|which|how|can|does|is|will)\b/i.test(
      question,
    );
  if (
    !compoundInventory &&
    materials.length &&
    /\b(?:what|which)\b.*\b(?:temperature|settings?)\b|\bhow hot\b|\b(?:need|necessary)\b.*(?:[0-9]|temperature|degrees?|°\s*c)/i.test(
      question,
    )
  )
    return { ...result, kind: "print_settings" };
  if (
    !compoundInventory &&
    /\b(?:print|plate|bed|adhesive|cool|cooling)\b/i.test(question) &&
    /\b(?:release|releases|cooling|cool down|remove the print)\b/i.test(
      question,
    )
  )
    return { ...result, kind: "release_behavior" };
  // Keep compound specification requests and explicit full inventories on the
  // existing complete-evidence path; a partial intent must not hide a limitation.
  if (
    /\b(?:and|also|plus)\b.*\b(?:can|does|is|will|what|how|when|which)\b|\b(?:all|every|complete|full|unknowns?)\b|\b(?:made (?:of|from)|body material)\b|°\s*c|\b(?:temperature|degrees?|celsius|dry|drying|anneal|heater|heat|speed|voltage|amps?|battery|connector|colour|color|price|stock|delivery)\b/i.test(
      question,
    )
  )
    return result;
  if (
    /\b(?:apply|application|instructions|procedure)\b|\bhow (?:do I|to) use\b/i.test(
      question,
    )
  )
    return { ...result, kind: "application" };
  if (/\b(?:fit|fits|fitting|mount|mounting|thread|threads)\b/i.test(question))
    return { ...result, kind: "fit" };
  const asksUse =
    /\b(?:can|could|will|would|does|is)\b.*\b(?:use|print|work|support|suitable|compatible|good)\b|^(?:and\s+)?(?:what|how) about\b/i.test(
      question,
    );
  const listsMaterials =
    /\bmaterials?\b.*\b(?:support|compatible|use|print)|\b(?:support|compatible)\b.*\bmaterials?\b/i.test(
      question,
    );
  if (
    ((materials.length || currentSurfaces.length) && asksUse) ||
    listsMaterials
  )
    return { ...result, kind: "material_use" };
  return result;
}
export function intentFactPattern(intent: KnowledgeAnswerIntent) {
  const conditions = "|^conditions?$|^safety$|^warnings?$";
  switch (intent.kind) {
    case "release_behavior":
      return new RegExp(
        "cooling_release|release_behavior|release_condition|cooling_condition" +
          conditions,
        "i",
      );
    case "print_settings":
      return new RegExp(
        "(?:print|nozzle|bed|filament).*temperature|temperature.*(?:print|nozzle|bed|filament)|recommended_settings" +
          conditions,
        "i",
      );
    case "application":
      return new RegExp(
        "application|instructions|preparation|coverage|quantity|procedure" +
          conditions,
        "i",
      );
    case "fit":
      return new RegExp(
        "exact_fit|compatib|mount|thread|printer|dimension|installation|electrical_configuration" +
          conditions,
        "i",
      );
    case "material_use":
      return new RegExp(
        "material_scope|supported_material|material_compatib|filament_compatib|surface|build_plate|material_condition|material_limit" +
          conditions,
        "i",
      );
    default:
      return undefined;
  }
}
