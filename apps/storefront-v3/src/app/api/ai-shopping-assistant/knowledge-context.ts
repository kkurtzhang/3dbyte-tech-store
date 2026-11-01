import {
  getProductLookupDecision,
  prepareProductLinkStep,
} from "./product-link-routing";
import type { AssistantMessage } from "./history";
import type { KnowledgeInput } from "./knowledge-execution";

export function knowledgeTopics(question: string) {
  question = question.replace(/&amp;/gi, "&");
  return [
    ...(/°\s*c|\b(?:temperature|degrees?|celsius|how hot|heat(?:er|ing)?|drying)\b/i.test(
      question,
    )
      ? ["temperature" as const]
      : []),
    ...(/\b(?:made (?:of|from)|materials?|metal|built out of|copper|steel|brass|abrasive|outdoors?|outside|weather)\b/i.test(
      question,
    )
      ? ["material" as const]
      : []),
    ...(/\b(?:voltage|volts?|amps?|current (?:rating|limit|draw)|(?:continuous|peak|burst) current|battery|connector|esc|electrical|power)\b/i.test(
      question,
    )
      ? ["electrical" as const]
      : []),
    ...(/\b(?:compatible|compatibility|fits?|threads?|work with|use with|safe|safely)\b/i.test(
      question,
    )
      ? ["compatibility" as const]
      : []),
  ];
}

export function buildKnowledgeContext(messages: readonly AssistantMessage[]) {
  // Customer text identifies the subject; historical model text/IDs are never evidence.
  const users = messages.filter((message) => message.role === "user").slice(-4);
  const question = users.at(-1)?.content ?? "";
  const previous = users
    .slice(0, -1)
    .map((message) => message.content)
    .join(" ");
  const clarification =
    /\b(?:what (?:details|information) do you need|what do you need from me|what should I (?:send|provide)|how (?:can|do) I (?:find|identify))\b/i.test(
      question,
    );
  const contextualFollowup =
    /\b(?:it|this|that|one)\b/i.test(question) &&
    /\b(?:run|use|print|fit|work|handle)\b/i.test(question) &&
    previous.length > 0;
  const usageQuestion =
    /\b(?:can|could|would|will|does|is|are)\b.*\b(?:use|run|print|work|fit|support|handle)\b/i.test(
      question,
    );
  return {
    question,
    previousQuestion: previous.slice(-1000),
    retrievalQuestion: previous
      ? `${previous.slice(-70)} ${question.slice(0, 49)}`
      : question.slice(0, 120),
    requiresKnowledge:
      !clarification &&
      (knowledgeTopics(question).length > 0 ||
        contextualFollowup ||
        usageQuestion ||
        (previous.length > 0 &&
          /^(?:and\s+)?(?:what|how) about\b/i.test(question)) ||
        /\b(?:apply|application|instructions)\b/i.test(question) ||
        /\b(?:specifications?|specs|manual|documented|made of|made from)\b/i.test(
          question,
        )),
  };
}
export type KnowledgeContext = ReturnType<typeof buildKnowledgeContext>;

export function prepareKnowledgeStep(
  context: KnowledgeContext,
  knowledgeAttempted: boolean,
  productsAttempted: boolean,
  lookupAllowed: boolean,
) {
  if (!context.requiresKnowledge || knowledgeAttempted) return undefined;
  return {
    toolChoice: {
      type: "tool",
      toolName:
        !productsAttempted && lookupAllowed
          ? "searchProducts"
          : "searchKnowledge",
    },
  } as const;
}

export function scopeKnowledgeInput(
  input: KnowledgeInput,
  context: KnowledgeContext,
  candidates: readonly { id: string; direct: boolean }[],
) {
  const direct = Array.from(
    new Set(
      candidates
        .filter((candidate) => candidate.direct)
        .map((candidate) => candidate.id),
    ),
  );
  return {
    ...input,
    // Only a single direct match from THIS request may supply a product ID. Never a variant.
    ...(!input.product_id && direct.length === 1
      ? { product_id: direct[0] }
      : {}),
    ...(/\b(?:it|its|this|that|the same)\b|^(?:and\s+)?(?:what|how) about\b/i.test(
      input.query,
    )
      ? { query: context.retrievalQuestion }
      : {}),
  };
}

/** A title is identity context, never specification evidence. Ambiguity stays unresolved. */
export function knowledgeSubject(
  candidates: readonly { id: string; direct: boolean; title: string }[],
) {
  const direct = candidates.filter((candidate) => candidate.direct);
  return direct.length === 1 ? direct[0].title : "";
}

/** Preserve a declined lookup across follow-ups, while honoring a new explicit request. */
export function conversationProductLookupDecision(
  messages: readonly AssistantMessage[],
) {
  const users = messages.filter((message) => message.role === "user");
  const current = getProductLookupDecision(users.at(-1)?.content ?? "");
  for (const message of users.slice().reverse()) {
    const decision = getProductLookupDecision(message.content);
    const explicitLookup =
      /^(?:please\s+)?(?:(?:can|could|would) you\s+(?:please\s+)?)?(?:search|look up|find)\s+(?:(?:the|some)\s+)?(?:products?|catalogue|catalog)\b/i.test(
        message.content,
      );
    if (
      !decision.lookupAllowed ||
      prepareProductLinkStep(message.content, 0, decision) ||
      explicitLookup
    )
      return decision;
  }
  return current;
}
