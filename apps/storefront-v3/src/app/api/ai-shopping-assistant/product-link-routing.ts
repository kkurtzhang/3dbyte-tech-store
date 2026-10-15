// A named product-page request can be searched without claiming compatibility.
// Require the page/link itself as the verb's object, not a ticket or explanation.
const explicitProductLinkRequest =
  /^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?(?:send|show|share|give|find|provide|fetch)\s+(?:(?:me|us)\s+)?(?:(?:a|an|the|some)\s+)?product\s+(?:pages?|links?|urls?)\s+(?:for|of)\s+(.+?)[?.!]*$/i;

const declinePrefix = String.raw`\b(?:do not|don't|don’t|never|no need to|skip|avoid|without)\s+`;
const lookupNoun = String.raw`(?:(?:a|another|any|the|new)\s+){0,2}(?:(?:product|catalog|catalogue)\s+)?(?:search|lookup)`;
const lookupAction = String.raw`(?:search(?:ing)?|look(?:ing)?\s+up|(?:(?:run(?:ning)?|do(?:ing)?|perform(?:ing)?|start(?:ing)?|repeat(?:ing)?)\s+)?${lookupNoun})\b`;
const pageReference = String.raw`(?:(?:a|an|the|any|this|that|these|those|my)\s+)?(?:product\s+)?(?:pages?|links?|urls?)\b`;
const pageAction = String.raw`(?:send(?:ing)?|show(?:ing)?|shar(?:e|ing)|giv(?:e|ing)|provid(?:e|ing)|fetch(?:ing)?|find(?:ing)?)\s+(?:(?:me|us|them|anyone)\s+)?${pageReference}`;
// Declining disclosure of details/prices is not declining a catalogue lookup.
const declinedLookup = new RegExp(
  `${declinePrefix}(?:${lookupAction}|${pageAction})`,
  "i",
);
const vagueSubject =
  /^(?:the\s+)?(?:it|this|that|those|these|one|ones|product|item)(?:\s+(?:you recommended|we discussed))?$/i;

export function isProductLookupDeclined(message: string) {
  return declinedLookup.test(message);
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
