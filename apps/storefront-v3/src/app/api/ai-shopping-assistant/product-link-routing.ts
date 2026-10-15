// A named product-page request can be searched without claiming compatibility.
// Require the page/link itself as the verb's object, not a ticket or explanation.
const explicitProductLinkRequest =
  /^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?(?:send|show|share|give|find|provide|fetch)\s+(?:(?:me|us)\s+)?(?:(?:a|an|the|some)\s+)?product\s+(?:pages?|links?|urls?)\s+(?:for|of)\s+(.+?)[?.!]*$/i;

export type ProductLookupDecision =
  | {
      readonly status: "allowed" | "unrelated-denied";
      readonly lookupAllowed: true;
    }
  | {
      readonly status: "product-denied" | "ambiguous";
      readonly lookupAllowed: false;
    };
type Denial = Exclude<ProductLookupDecision["status"], "allowed">;

// This is a bounded command grammar, not natural-language intent inference.
// Only a fully consumed unrelated object can grant the lookup exception.
const declinePrefix = String.raw`\b(?:do not|don't|don’t|never|no need to|skip|avoid|without)\s+`;
const lookupNoun = String.raw`(?:(?:a|an|another|any|the|new)\s+){0,2}(?:(?<scope>product|catalog|catalogue|order|account)\s+)?(?:search|lookup)`;
const lookupAction = String.raw`(?:search(?:ing)?|look(?:ing)?\s+up|(?:(?:run(?:ning)?|do(?:ing)?|perform(?:ing)?|start(?:ing)?|repeat(?:ing)?)\s+)?${lookupNoun})\b`;
const negativeCommand = new RegExp(declinePrefix, "gi");
const lookupStart = new RegExp(`^(?:${lookupAction})`, "i");
const otherAction =
  /^(?:send(?:ing)?|show(?:ing)?|shar(?:e|ing)|giv(?:e|ing)|provid(?:e|ing)|fetch(?:ing)?|find(?:ing)?|look(?:ing)?\s+at|run(?:ning)?)\s+(?:(?:me|us)\s+)?/i;
// These negate omission/abandonment, rather than the requested lookup itself.
const positiveReminder =
  /^(?:forget\s+to|give\s+up)\s+(?:search(?:ing)?|look(?:ing)?\s+up|send|show|share|give|provide|fetch|find)\b/i;
const vagueSubject =
  /^(?:the\s+)?(?:it|this|that|those|these|one|ones|product|item)(?:\s+(?:you recommended|we discussed))?$/i;
const objectPrefix =
  /^(?:(?:through|in|for|inside|my|our|the|a|an|any|all|this|that|these|those)\s+){0,4}/i;
const unrelatedObject =
  /^(?:(?:private|personal)\s+)?(?:orders?(?:\s+(?:history|status|details|records))?|accounts?(?:\s+(?:history|details|records|data))?|profiles?(?:\s+(?:details|records|data))?|addresses|address|customer\s+(?:records|details|data)|(?:personal|private)\s+(?:details|data)|(?:purchase|payment|shipping|tracking|browsing)\s+(?:history|details|records))(?:\s+for\s+(?:product|order|account)\s+(?:details|records|history))?$/i;
const productObject =
  /^(?:products?|catalog|catalogue|product\s+(?:catalog|catalogue|pages?|links?|urls?|search)|pages?|links?|urls?)(?:\s+(?:for|of)\s+.+)?$/i;
const listSeparator = /\s*(?:,?\s*\b(?:and|or|nor|plus)\b|[,&])\s*/i;
const trailingConnector =
  /(?:,?\s*\b(?:and|or|nor|plus|but|however|instead|then)\b|[,&])\s*$/i;
// A contrast followed by a new positive imperative ends the declined object.
// Unknown continuations (including bare nouns after "but") stay ambiguous.
const positiveClause =
  /(?:,\s*)?\b(?:but|however|instead|then)\s+(?=(?:please\s+)?(?:send|show|share|give|find|provide|fetch|browse|view)\b)/i;

function classifyObject(value: string, disclosure: boolean): Denial {
  const target = value
    .trim()
    .replace(objectPrefix, "")
    .replace(/(?:\s+|^)(?:again|yet|either|please|at all)$/i, "")
    .trim();
  if (!target || productObject.test(target)) return "product-denied";
  if (
    unrelatedObject.test(target) ||
    (disclosure && /^(?:prices|benchmarks)$/i.test(target))
  )
    return "unrelated-denied";
  return "ambiguous";
}

function combineDenials(denials: Denial[]): ProductLookupDecision {
  if (denials.includes("product-denied"))
    return { status: "product-denied", lookupAllowed: false };
  if (denials.includes("ambiguous"))
    return { status: "ambiguous", lookupAllowed: false };
  return denials.length
    ? { status: "unrelated-denied", lookupAllowed: true }
    : { status: "allowed", lookupAllowed: true };
}

function classifyCommand(command: string): Denial[] {
  if (positiveReminder.test(command)) return [];
  const lookup = lookupStart.exec(command);
  const other = lookup ? null : otherAction.exec(command);
  const action = lookup ?? other;
  if (!action) return ["ambiguous"];
  const object = command.slice(action[0].length).trim();
  const scope = lookup?.groups?.scope;
  const targets = (scope ? `${scope} ${object}`.trim() : object).split(
    listSeparator,
  );
  return targets.map((target) =>
    targets.length > 1 && !target.trim()
      ? "ambiguous"
      : classifyObject(target, Boolean(other)),
  );
}

export function getProductLookupDecision(
  message: string,
): ProductLookupDecision {
  const denials: Denial[] = [];
  // Normalize the common encoded conjunction before splitting sentence boundaries.
  const clauses = message.replace(/&amp;/gi, "&").split(/[.!?;\n]/);
  for (const clause of clauses) {
    const negatives = Array.from(clause.matchAll(negativeCommand));
    for (let index = 0; index < negatives.length; index++) {
      const negative = negatives[index];
      const nextNegative = negatives[index + 1];
      const remainder = clause.slice(
        negative.index + negative[0].length,
        nextNegative?.index,
      );
      const command = (
        nextNegative ? remainder.replace(trailingConnector, "") : remainder
      )
        .split(positiveClause, 1)[0]
        .trim();
      denials.push(...classifyCommand(command));
    }
  }
  return combineDenials(denials);
}

// Compatibility helper for existing callers/probes. Ambiguity also blocks lookup.
export function isProductLookupDeclined(message: string) {
  return !getProductLookupDecision(message).lookupAllowed;
}

// An explicit catalogue command is distinct from an empty or failed named search.
export function isExplicitProductBrowse(message: string) {
  return /^(?:please\s+)?(?:browse|show(?:\s+me)?|view)\s+(?:the\s+)?(?:catalogue|catalog|products)(?:\s+please)?[.!?]*$/i.test(
    message.trim(),
  );
}

export function prepareProductLinkStep(
  message: string,
  stepNumber: number,
  decision = getProductLookupDecision(message),
) {
  if (stepNumber !== 0 || !decision.lookupAllowed) {
    return undefined;
  }

  const subject = explicitProductLinkRequest.exec(message.trim())?.[1]?.trim();
  if (
    !isExplicitProductBrowse(message) &&
    (!subject || vagueSubject.test(subject))
  ) {
    return undefined;
  }

  // Force only the first lookup; subsequent steps can answer or clarify normally.
  return { toolChoice: { type: "tool", toolName: "searchProducts" } } as const;
}
