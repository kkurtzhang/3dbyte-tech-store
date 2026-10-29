import type {
  ApprovedKnowledgeDocument,
  KnowledgeFact,
} from "@3dbyte-tech-store/shared-types";
import type { KnowledgeAnswerIntent } from "./knowledge-answer-intent";

/**
 * Reviewed presentation pairs, not an alternative source of specifications.
 * A pair applies only to a current validated document with this exact source,
 * field AND complete approved value. New qualifiers/values fail closed to the
 * original statement. Original quotes, revisions, scope and conflict comparison
 * remain untouched. Prefer direct claim wording during future content review.
 */
const presentations = [
  {
    source: "https://magigoo.com/products/magigoo-original",
    field: "material_scope",
    original:
      "Magigoo describes Original as designed and tested on glass build plates for PLA, ABS, PETG, HIPS and TPU.",
    statement:
      "Magigoo Original is designed and tested for PLA, ABS, PETG, HIPS and TPU on glass build plates.",
    materialUse: {
      name: "Magigoo Original",
      materials: ["PLA", "ABS", "PETG", "HIPS", "TPU"],
      surfaces: ["glass"],
    },
  },
  {
    source: "https://magigoo.com/products/magigoo-original",
    field: "cooling_release",
    original:
      "The manufacturer describes a thermally activated adhesive that holds the print on a hot bed and releases after cooling.",
    statement:
      "Magigoo Original holds the print on a hot bed and releases after cooling.",
  },
  {
    source: "https://www.phaetus.com/products/dragonfly-hotend-bms",
    field: "body_material",
    original:
      "Phaetus describes Dragonfly BMS as made mainly from copper alloy.",
    statement: "Dragonfly BMS is made mainly from copper alloy.",
  },
];
export function reviewedPresentation(
  document: ApprovedKnowledgeDocument,
  fact: KnowledgeFact,
) {
  return presentations.find(
    (item) =>
      item.source === document.source_url &&
      item.field === fact.field &&
      item.original === fact.value,
  );
}
function list(items: string[]) {
  return items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
export function presentMaterialUse(
  document: ApprovedKnowledgeDocument,
  fact: KnowledgeFact,
  intent: KnowledgeAnswerIntent,
) {
  const presentation = reviewedPresentation(document, fact);
  const scope = presentation?.materialUse;
  if (!scope) return undefined;
  const unsupportedMaterials = intent.materials.filter(
    (material) => !scope.materials.includes(material),
  );
  const unknownSurface =
    intent.qualifiedSurface ||
    intent.surfaces.some(
      (surface) => !scope.surfaces.includes(surface.toLowerCase()),
    );
  if (unsupportedMaterials.length || unknownSurface) {
    const requirement = [
      ...(unsupportedMaterials.length
        ? [`suitability for ${list(unsupportedMaterials)}`]
        : []),
      ...(unknownSurface
        ? [
            `compatibility with ${intent.qualifiedSurface ? "that build surface" : list(intent.surfaces)}`,
          ]
        : []),
    ].join(" and ");
    return [
      `I can't confirm ${scope.name}'s ${requirement}.`,
      presentation.statement,
      "Check the adhesive and plate manufacturers' compatibility guidance before applying it.",
    ].join("\n\n");
  }
  const materials = intent.materials.length
    ? intent.materials
    : scope.materials;
  return [
    `${scope.name} is designed and tested for ${list(materials)} on glass build plates.`,
    ...(intent.materials.length && !intent.surfaces.length
      ? ["Which build plate surface are you using?"]
      : []),
  ].join("\n\n");
}
