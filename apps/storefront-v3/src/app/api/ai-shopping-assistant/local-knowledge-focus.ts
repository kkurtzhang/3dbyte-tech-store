import {
  matchReferenceSubjects,
  type CatalogueGroupKey,
} from "./local-catalogue-subjects";

type Message = {
  role: "user" | "assistant";
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
};
type GroupKey = CatalogueGroupKey;
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
  const { subjects: named, uncertain } = matchReferenceSubjects(latest);
  if (uncertain) return { mode: "clarify", question: latest, subjects: named.map((subject) => subject.name), reason: "unverified_or_ambiguous_reference" };
  const pronounMatch = latest.match(anaphora);
  const conjunction = pronounMatch?.[0].toLowerCase() === "that" &&
    /\b(?:prove|confirm|show|mean|suggest|establish)\s*$/i.test(
      latest.slice(0, pronounMatch.index),
    );
  const pronoun = conjunction ? -1 : pronounMatch?.index ?? -1;
  const firstName = named.length
    ? Math.min(...named.map((subject) => latest.search(subject.pattern)))
    : -1;
  const explicitlyNamedNoun =
    firstName >= 0 &&
    pronoun >= 0 &&
    ["its", "their", "this", "these", "those"].includes(
      (pronounMatch?.[0] || "").toLowerCase(),
    ) &&
    /^(?:[a-z0-9]+\s*){0,3}$/i.test(
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
    if (privateContext.test(previous) || /\b(?:WES248[789]|3d\s*sets|sandy|landy|sakura|buggster|skippy|triton)\b/i.test(previous)) break;
    const { subjects: candidates, uncertain: ambiguous } = matchReferenceSubjects(previous);
    if (ambiguous || candidates.length > 1)
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
