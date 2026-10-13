import type { LocalKnowledgeFocus } from "./local-knowledge-focus";
import index from "./three-d-sets-source-index.json";

type Message = {
  role: "user" | "assistant";
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
};
const text = (message: Message) =>
  message.content ??
  message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("") ??
  "";
const skus = index.retailer_examples.map((example) => example.retailer_sku);
const mentions = (question: string) =>
  skus.filter((sku) => new RegExp("\\b" + sku + "\\b", "i").test(question));
const privateContext =
  /\b(?:order|cart|customer|cus)_[a-z0-9_]+|[^\s@]+@[^\s@]+\.[^\s@]+|\b(?:my order|track my|my account)\b/i;
export function resolveLocalRetailerFocus(
  messages: Message[],
): LocalKnowledgeFocus | null {
  const users = messages.filter((message) => message.role === "user");
  const latest = text(users[users.length - 1] || { role: "user" });
  let named = mentions(latest);
  let focused = false;
  if (
    !named.length &&
    /\b(?:it|its|that|this|they|their|those|these)\b/i.test(latest) &&
    !/\b(?:instead|switch to|what about|rather than)\b/i.test(latest)
  ) {
    const previous = users[users.length - 2];
    if (previous && !privateContext.test(text(previous))) {
      named = mentions(text(previous));
      focused = named.length > 0;
    }
  }
  if (!named.length) return null;
  const subjects = named.map((sku) => "DREMC retailer reference " + sku);
  if (named.length > 1)
    return {
      mode: "clarify",
      question: latest,
      subjects,
      reason: "ambiguous_retailer_reference",
    };
  const question = focused ? subjects[0] + ". " + latest : latest;
  if (question.length > 500)
    return {
      mode: "clarify",
      question: latest,
      subjects,
      reason: "question_context_limit",
    };
  return {
    mode: focused ? "focused" : "direct",
    question,
    subjects,
    reason: "captured_external_retailer_reference",
  };
}
