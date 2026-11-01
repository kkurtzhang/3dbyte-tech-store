import type {
  ApprovedKnowledgeDocument,
  KnowledgeFact,
} from "@3dbyte-tech-store/shared-types";
import type { KnowledgeAnswerIntent } from "./knowledge-answer-intent";

export type KnowledgeClaim = {
  kind: "materials" | "construction" | "release" | "temperature";
  name: string;
  statement: string;
  materials?: string[];
  surface?: string;
  temperature?: string;
};
const INSTALLATION_QUALIFIER =
  " This does not establish an assembled printer's safe operating temperature or its heater, sensor, wiring and firmware limits.";
function tokens(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}
function nameFor(
  document: ApprovedKnowledgeDocument,
  reporter: string,
  subject: string,
) {
  if (!/^[A-Za-z0-9][A-Za-z0-9 &+.-]*$/.test(subject)) return undefined;
  const name = subject.toLowerCase().startsWith(reporter.toLowerCase() + " ")
    ? subject
    : `${reporter} ${subject}`;
  const title = tokens(document.product_title);
  let position = 0;
  for (const token of tokens(name)) {
    const index = title.indexOf(token, position);
    if (index < 0) return undefined;
    position = index + 1;
  }
  return name;
}
export function list(items: string[]) {
  return items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
/**
 * Parse complete, narrowly specified claim forms after document validation.
 * This is not prefix stripping or semantic entailment verification. Every clause
 * must fit the grammar; unknown qualifiers/negations/URLs/code keep their original
 * statement. No product names, source URLs, material lists or numeric ratings are
 * supplied by this renderer. Original values still determine conflicts/sources.
 */
export function parseKnowledgeClaim(
  document: ApprovedKnowledgeDocument,
  fact: KnowledgeFact,
): KnowledgeClaim | undefined {
  const value = fact.value;
  if (!value) return undefined;
  if (fact.field === "material_scope") {
    const match = value.match(
      /^([A-Z][A-Za-z0-9 &-]{0,60}) describes (.+?) as designed and tested on (glass|smooth PEI|textured PEI|PEI) build plates for (.+)\.$/,
    );
    if (!match) return undefined;
    const name = nameFor(document, match[1], match[2]);
    const materials = match[4].split(/,\s*(?:and\s+)?|\s+and\s+/);
    if (
      !name ||
      materials.some((item) => !/^[A-Za-z0-9][A-Za-z0-9+.-]{0,20}$/.test(item))
    )
      return undefined;
    return {
      kind: "materials",
      name,
      materials,
      surface: match[3],
      statement: `${name} is designed and tested for ${list(materials)} on ${match[3]} build plates.`,
    };
  }
  if (fact.field === "body_material") {
    const match = value.match(
      /^([A-Z][A-Za-z0-9 &-]{0,60}) describes (.+?)(?: as made| construction as) mainly (?:from )?([A-Za-z][A-Za-z -]{0,80})\.$/,
    );
    if (!match) return undefined;
    const name = nameFor(document, match[1], match[2]);
    if (name)
      return {
        kind: "construction",
        name,
        statement: `${name} is mainly ${match[3]}.`,
      };
  }
  if (
    fact.field === "cooling_release" &&
    value ===
      "The manufacturer describes a thermally activated adhesive that holds the print on a hot bed and releases after cooling."
  ) {
    const name = document.product_title;
    return {
      kind: "release",
      name,
      statement: `${name} is thermally activated: it holds the print on a hot bed and releases after cooling.`,
    };
  }
  if (
    /^component_temperature_(?:headline|rating)$|^temperature_resistance$/.test(
      fact.field,
    )
  ) {
    const core = value.endsWith(INSTALLATION_QUALIFIER)
      ? value.slice(0, -INSTALLATION_QUALIFIER.length)
      : value;
    const match = core.match(
      /^([A-Z][A-Za-z0-9 &-]{0,60}) (?:advertises|states|lists) (?:a )?([0-9]{1,4}(?:\.[0-9]+)?°C) (?:component rating|temperature-resistance rating)\.$/,
    );
    if (
      match &&
      tokens(match[1]).every((token) =>
        tokens(document.product_title).includes(token),
      )
    )
      return {
        kind: "temperature",
        name: document.product_title,
        temperature: match[2],
        statement: `The hotend has a stated ${match[2]} heat-resistance rating.`,
      };
  }
  return undefined;
}
export function presentMaterialUse(
  document: ApprovedKnowledgeDocument,
  fact: KnowledgeFact,
  intent: KnowledgeAnswerIntent,
) {
  const claim = parseKnowledgeClaim(document, fact);
  if (claim?.kind !== "materials" || !claim.materials || !claim.surface)
    return undefined;
  const unsupported = intent.materials.filter(
    (material) =>
      !claim.materials!.some((item) => item.toUpperCase() === material),
  );
  const unknownSurface =
    intent.qualifiedSurface ||
    intent.surfaces.some(
      (surface) => surface.toLowerCase() !== claim.surface!.toLowerCase(),
    );
  if (unsupported.length || unknownSurface) {
    const requirement = [
      ...(unsupported.length ? [`suitability for ${list(unsupported)}`] : []),
      ...(unknownSurface
        ? [
            `compatibility with ${intent.qualifiedSurface ? "that build surface" : list(intent.surfaces)}`,
          ]
        : []),
    ].join(" and ");
    return [
      claim.statement,
      `That scope does not establish ${requirement}. Check the adhesive and plate manufacturers' compatibility guidance before applying it.`,
    ].join("\n\n");
  }
  const materials = intent.materials.length
    ? intent.materials
    : claim.materials;
  return [
    `${claim.name} is designed and tested for ${list(materials)} on ${claim.surface} build plates.`,
    ...(intent.materials.length && !intent.surfaces.length
      ? ["Which build plate surface are you using?"]
      : []),
  ].join("\n\n");
}
