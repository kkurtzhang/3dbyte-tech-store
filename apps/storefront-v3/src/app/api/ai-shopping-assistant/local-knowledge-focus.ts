import {
  catalogueSubjects,
  type CatalogueGroupKey,
} from "./local-catalogue-subjects";

type Message = {
  role: "user" | "assistant";
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
};
type GroupKey =
  | "five_E03"
  | "five_E04"
  | "five_E08"
  | "five_E09"
  | "five_E10"
  | CatalogueGroupKey;
type Subject = { name: string; pattern: RegExp; groupKey?: GroupKey };

// These identify corpus reference groups/families, never physical supplier variants.
// Public part identities in the current corpus. These do not select a store SKU.
const referenceParts = ["2101020285", "2102013424", "3103110660", "3201011488", "3201011519", "3203010897", "3203010968", "4001030132", "4001030145", "4001030147", "4001040056", "4004010266", "4004010278", "4004010288", "4006030075", "4007010136"];
const subjects: Subject[] = [
  ...catalogueSubjects,
  ...referenceParts.map((part) => ({
    name: "Creality part " + part,
    pattern: new RegExp("\\b" + part + "\\b"),
  })),
  { name: "TPU95-HF", pattern: /\btpu95[\s-]*hf\b/i, groupKey: "five_E03" },
  {
    name: "PA6-CF20",
    pattern: /\bpa6[\s-]*cf20\b|\bpolymide\s+pa6[\s-]*cf\b/i,
    groupKey: "five_E04",
  },
  { name: "Supergrip", pattern: /\bsupergrip\b/i, groupKey: "five_E08" },
  {
    name: "Plastic Repellent Paint",
    pattern: /\bplastic repellent paint\b|\bprp\b/i,
    groupKey: "five_E09",
  },
  {
    name: "V6 Pro socks",
    pattern: /\bv6\b.*\bpro\b.*\bsocks?\b|\bv6\b.*\bsocks?\b.*\bpro\b/i,
    groupKey: "five_E10",
  },
  {
    name: "V6 hardened-steel nozzle",
    pattern: /\bv6\b.*\bhardened[\s-]+steel\b.*\bnozzles?\b/i,
  },
  { name: "Revo brass nozzle", pattern: /\brevo\b.*\bbrass\b.*\bnozzles?\b/i },
  { name: "ASA", pattern: /\basa\b/i },
  { name: "PETG", pattern: /\bpetg\b/i },
  { name: "PLA", pattern: /\bpla\b/i },
];
const privateContext =
  /\b(?:order|cart|customer|cus)_[a-z0-9_]+|[^\s@]+@[^\s@]+\.[^\s@]+|\b(?:my order|track my|my account)\b/i;
const switchSubject = /\b(?:what about|instead|switch to|rather than)\b/i;
const anaphora = /\b(?:it|its|that|this|those|these|they|their|them)\b/i;
function text(message: Message): string {
  return (
    message.content ??
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text || "")
      .join("") ??
    ""
  ).trim();
}
function mentions(question: string): Subject[] {
  const matched = subjects.filter((subject) => subject.pattern.test(question));
  // A named CM2 nozzle should not inherit the generic FlowTech hotend alias.
  const namedCm2 = matched.some(
    (subject) => subject.groupKey === "catalogue_flowtech_cm2_04",
  );
  return namedCm2 && !/\bm3101\b/i.test(question)
    ? matched.filter((subject) => subject.groupKey !== "catalogue_flowtech_m3101")
    : matched;
}
function topic(question: string): string | undefined {
  if (/\b(?:dry|drying|dryer)\b/i.test(question)) return "drying";
  if (
    /\b(?:bed|nozzle)\b.*\btemperature\b|\b(?:fit|compatible|compatibility|ams)\b/i.test(
      question,
    )
  )
    return "explicit_other_topic";
  if (/\b(?:storage|store|humidity)\b/i.test(question))
    return "storage humidity";
  return undefined;
}
export type LocalKnowledgeFocus = {
  mode: "direct" | "focused" | "clarify";
  question: string;
  groupKey?: GroupKey;
  subjects: string[];
  reason: string;
};
export function resolveLocalKnowledgeFocus(
  messages: Message[],
): LocalKnowledgeFocus {
  const users = messages.filter((message) => message.role === "user");
  const latest = text(users[users.length - 1]);
  const named = mentions(latest);
  const pronounMatch = latest.match(anaphora);
  const pronoun = pronounMatch?.index ?? -1;
  const firstName = named.length
    ? Math.min(...named.map((subject) => latest.search(subject.pattern)))
    : -1;
  const explicitlyNamedNoun =
    firstName >= 0 &&
    pronoun >= 0 &&
    ["its", "their", "this", "these", "those"].includes(
      (pronounMatch?.[0] || "").toLowerCase(),
    ) &&
    /^(?:e3d|polymaker|magigoo)?$/i.test(
      latest.slice(pronoun + (pronounMatch?.[0].length || 0), firstName).trim(),
    );
  const direct = (): LocalKnowledgeFocus => ({
    mode: "direct",
    question: latest,
    subjects: named.map((subject) => subject.name),
    groupKey: named.length === 1 ? named[0].groupKey : undefined,
    reason: "explicit_latest_question",
  });
  if (
    (switchSubject.test(latest) && (named.length > 0 || pronoun < 0)) ||
    pronoun < 0 ||
    explicitlyNamedNoun ||
    (firstName >= 0 && firstName < pronoun)
  )
    return direct();
  for (const message of users.slice(0, -1).reverse()) {
    const previous = text(message);
    // An intervening private context or unrecognised explicit switch ends focus.
    if (privateContext.test(previous)) break;
    const candidates = mentions(previous);
    if (candidates.length > 1)
      return {
        mode: "clarify",
        question: latest,
        subjects: candidates.map((subject) => subject.name),
        reason: "ambiguous_previous_subject",
      };
    if (candidates.length === 1) {
      const subject = candidates[0];
      const hint = topic(latest) ? undefined : topic(previous);
      const question =
        subject.name +
        (hint && hint !== "explicit_other_topic" ? " " + hint : "") +
        ". " +
        latest;
      if (question.length > 500)
        return {
          mode: "clarify",
          question: latest,
          subjects: [subject.name],
          reason: "question_context_limit",
        };
      return {
        mode: "focused",
        question,
        groupKey: subject.groupKey,
        subjects: [subject.name],
        reason: "named_previous_user_subject",
      };
    }
    if (switchSubject.test(previous)) break;
  }
  return {
    mode: "clarify",
    question: latest,
    subjects: [],
    reason: "missing_previous_subject",
  };
}
