import { referenceRegistry } from "./local-product-registry.generated";

// One closed allowlist, reproduced from the 100 counted source references.
export type CatalogueGroupKey =
  (typeof referenceRegistry.entries)[number]["groupKey"];
export const catalogueGroupKeys = referenceRegistry.entries.map(
  (entry) => entry.groupKey,
) as [CatalogueGroupKey, ...CatalogueGroupKey[]];
export type ReferenceSubject = {
  name: string;
  pattern: RegExp;
  groupKey?: CatalogueGroupKey;
};
export const catalogueSubjects: ReferenceSubject[] =
  referenceRegistry.entries.map((entry) => ({
    name: entry.name,
    groupKey: entry.groupKey,
    pattern: new RegExp(
      "\\b(?:" + entry.aliases.join("|") + ")(?![a-z0-9]|\\.\\d)",
      "i",
    ),
  }));
const unboundSubjects: ReferenceSubject[] = [
  { name: "Creality part 4004010278", pattern: /\b4004010278\b/i },
  {
    name: "V6 hardened-steel nozzle",
    pattern: /\bv6\s+hardened[\s-]+steel\s+nozzles?\b/i,
  },
  { name: "Revo brass nozzle", pattern: /\brevo\s+brass\s+nozzles?\b/i },
  ...["ASA", "PETG", "PLA"].map((name) => ({
    name,
    pattern: new RegExp("\\b" + name + "\\b", "i"),
  })),
];
const families =
  /\b(?:manta\s*m8p|sfs|leviathan|cartographer|nitehawk|magigoo|lgx|flowtech|space\s*pi|eddy|sb2209|skr\s*mini\s*e3|skr\s*pico|ebb\s*36|rapido|varioshore|python\s*flex|fiberlogy\s+(?:nylon|pa12)|colorfabb\s+tpu)\b/gi;
const unverifiedRevision =
  /\bsb2209\b.*\b(?:rp2040|usb)\b|\bskr\s*mini\s*e3\s*v?3\.0\.\d|\blgx\s*lite\s*v?2\b.*\bmirrored\b|\bvarioshore\b.*\b(?:prosthetic|85a|95a)\b|\bsfs\s*v?2\.1\b/i;
type Mention = { subject: ReferenceSubject; start: number; end: number };
export function matchReferenceSubjects(question: string): {
  subjects: ReferenceSubject[];
  uncertain: boolean;
} {
  const hits: Mention[] = [];
  for (const subject of [...catalogueSubjects, ...unboundSubjects]) {
    for (const match of Array.from(
      question.matchAll(new RegExp(subject.pattern.source, "gi")),
    ))
      hits.push({
        subject,
        start: match.index,
        end: match.index + match[0].length,
      });
  }
  // A specific grade/title covers its contained generic alias; disjoint mentions
  // remain separate, including a second bare family in a comparison.
  const specific = hits.filter(
    (hit) =>
      !hits.some(
        (other) =>
          other.subject !== hit.subject &&
          other.start <= hit.start &&
          other.end >= hit.end &&
          other.end - other.start > hit.end - hit.start,
      ),
  );
  const uncoveredFamily = Array.from(question.matchAll(families)).some(
    (family) =>
      !specific.some(
        (hit) =>
          hit.start <= family.index &&
          hit.end >= family.index + family[0].length,
      ),
  );
  return {
    subjects: Array.from(new Set(specific.map((hit) => hit.subject))),
    uncertain: unverifiedRevision.test(question) || uncoveredFamily,
  };
}
export function hasReferenceContext(question: string): boolean {
  const match = matchReferenceSubjects(question);
  return match.uncertain || match.subjects.length > 0;
}
