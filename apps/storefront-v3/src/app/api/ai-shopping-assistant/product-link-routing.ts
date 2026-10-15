// A named product-page request can be searched without claiming compatibility.
// Keep vague references and other intents on the normal clarification path.
const explicitProductLinkRequest =
  /^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?(?:send|show|share|give|find|provide|fetch)\b[^.!?\n]{0,120}\bproduct\s+(?:pages?|links?|urls?)\s+(?:for|of)\s+(.+?)[?.!]*$/i;
const declinedLookup =
  /\b(?:(?:do not|don't|don’t|never|no need to|skip|avoid)\s+(?:search(?:ing)?|look(?:ing)?|fetch(?:ing)?|find(?:ing)?|send|show|share|give|provide)|without\s+(?:searching|looking|fetching|finding))\b/i;
const vagueSubject =
  /^(?:the\s+)?(?:it|this|that|those|these|one|ones|product|item)(?:\s+(?:you recommended|we discussed))?$/i;

export function prepareProductLinkStep(message: string, stepNumber: number) {
  if (stepNumber !== 0 || declinedLookup.test(message)) {
    return undefined;
  }

  const subject = explicitProductLinkRequest.exec(message.trim())?.[1]?.trim();
  if (!subject || vagueSubject.test(subject)) {
    return undefined;
  }

  // Force only the first lookup; subsequent steps can answer or clarify normally.
  return { toolChoice: { type: "tool", toolName: "searchProducts" } } as const;
}
