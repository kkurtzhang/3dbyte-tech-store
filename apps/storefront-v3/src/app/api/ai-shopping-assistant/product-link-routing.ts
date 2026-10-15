// A named product-page request can be searched without claiming compatibility.
// Require the page/link itself as the verb's object, not a ticket or explanation.
const explicitProductLinkRequest =
  /^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?(?:send|show|share|give|find|provide|fetch)\s+(?:(?:me|us)\s+)?(?:(?:a|an|the|some)\s+)?product\s+(?:pages?|links?|urls?)\s+(?:for|of)\s+(.+?)[?.!]*$/i;

const declinePrefix = String.raw`\b(?:do not|don't|don’t|never|no need to|skip|avoid|without)\s+`;
const lookupNoun = String.raw`(?:(?:a|another|any|the|new)\s+){0,2}(?:(?:product|catalog|catalogue)\s+)?(?:search|lookup)`;
const lookupAction = String.raw`(?:search(?:ing)?|look(?:ing)?\s+up|(?:(?:run(?:ning)?|do(?:ing)?|perform(?:ing)?|start(?:ing)?|repeat(?:ing)?)\s+)?${lookupNoun})\b`;
const pageReference = String.raw`(?:(?:a|an|the|any|this|that|these|those|my)\s+)?(?:product\s+)?(?:pages?|links?|urls?)\b`;
const pageAction = String.raw`(?:send(?:ing)?|show(?:ing)?|shar(?:e|ing)|giv(?:e|ing)|provid(?:e|ing)|fetch(?:ing)?|find(?:ing)?)\s+(?:(?:me|us|them|anyone)\s+)?${pageReference}`;
const declinedLookup = new RegExp(
  `${declinePrefix}(?:(?<lookup>${lookupAction})|(?<page>${pageAction}))`,
  "gi",
);
const vagueSubject =
  /^(?:the\s+)?(?:it|this|that|those|these|one|ones|product|item)(?:\s+(?:you recommended|we discussed))?$/i;

// Exempt only explicit non-product objects. An unspecified/ambiguous search
// opt-out still blocks product lookup, as does a mixed product/private-data list.
const nonProductObject =
  /^(?:(?:through|in|for|inside|my|our|the|a|an|any|all|private|personal)\s+)*(?:orders?|accounts?|profiles?|addresses|address|customer\s+(?:records?|details?|data)|(?:personal|private)\s+(?:details?|data)|(?:purchase|payment|shipping|tracking|browsing)\s+(?:history|details?|records?))\b/i;
const clauseBoundary = /[.!?;\n]|,?\s*\b(?:but|however|instead|then|whereas)\b/i;

export function isProductLookupDeclined(message: string) {
  const declines = Array.from(message.matchAll(declinedLookup));
  return declines.some((decline, index) => {
    if (
      decline.groups?.page ||
      /\b(?:product|catalog|catalogue)\b/i.test(decline.groups?.lookup ?? "")
    ) {
      return true;
    }

    // Stop before the next declined action; assess that action independently.
    const nextDecline = declines[index + 1];
    const complement = message.slice(
      decline.index + decline[0].length,
      nextDecline?.index,
    );
    const object = (nextDecline
      ? complement.replace(/(?:\s+\b(?:and|or|nor)\b\s*|,\s*)$/i, "")
      : complement
    )
      .split(clauseBoundary, 1)[0]
      .trim();
    const targets = object.split(/\s+\b(?:and|or|nor)\b(?:\s+|$)|\s*,\s*/i);
    return !targets.every((target) => nonProductObject.test(target));
  });
}

// An explicit catalogue command is distinct from an empty or failed named search.
export function isExplicitProductBrowse(message: string) {
  return /^(?:please\s+)?(?:browse|show(?:\s+me)?|view)\s+(?:the\s+)?(?:catalogue|catalog|products)(?:\s+please)?[.!?]*$/i.test(
    message.trim(),
  );
}

export function prepareProductLinkStep(message: string, stepNumber: number) {
  if (stepNumber !== 0 || isProductLookupDeclined(message)) {
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
