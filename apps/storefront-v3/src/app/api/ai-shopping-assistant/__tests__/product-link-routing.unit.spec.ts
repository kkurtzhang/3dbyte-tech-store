import { productLookupCases } from "../__fixtures__/product-lookup-cases";
import { getProductLookupDecision, prepareProductLinkStep } from "../product-link-routing";

describe("explicit product link routing", () => {
  it.each([
    "Can you send me the product page for the PETG you recommend?",
    "Please share the product link for Polymaker PolyLite PETG.",
    "Could you please show me product pages for hardened nozzles?",
    "Give me the product URL of the Dragonfly hotend!",
    "  Find the product page for a 1.75mm PETG spool  ",
  ])("looks up named product pages before clarification: %s", (message) => {
    expect(prepareProductLinkStep(message, 0)).toEqual({
      toolChoice: { type: "tool", toolName: "searchProducts" },
    });
    expect(prepareProductLinkStep(message, 1)).toBeUndefined();
    expect(prepareProductLinkStep(message, 4)).toBeUndefined();
  });

  it.each([
    "Will this nozzle fit my printer?",
    "Send me my order tracking link.",
    "Create a support ticket about a product page for PETG.",
    "Do not send me the product page for PETG.",
    "Can you send me the product page for PETG? Don't search yet.",
    "Send me the product page for PETG without searching again.",
    "Show me the product link for PETG, but skip searching.",
    "The product page for PETG does not load.",
    "Send me the product page.",
    "Send me the product link for that.",
    "Show me the product page for the one you recommended.",
    "What does 'send me the product page for PETG' mean?",
    "",
  ])(
    "preserves normal routing for other, declined or vague requests: %s",
    (message) => {
      expect(prepareProductLinkStep(message, 0)).toBeUndefined();
    },
  );
});

describe("independent review intent regressions", () => {
  it.each([
    {
      name: "original",
      message: "Can you send me the product page for the PETG you recommend?",
      lookup: true,
    },
    {
      name: "declines-search",
      message: "Send me the product page for PETG. Don't search yet.",
      lookup: false,
    },
    {
      name: "privacy-not-lookup-decline",
      message:
        "Send me the product page for PETG. Don't share my personal details.",
      lookup: true,
    },
    {
      name: "omit-price-not-lookup-decline",
      message: "Show me the product page for PETG, no need to show prices.",
      lookup: true,
    },
    {
      name: "without-a-search",
      message: "Send me the product page for PETG without a search.",
      lookup: false,
    },
    {
      name: "dont-run-search",
      message: "Show me the product page for PETG, but don't run a search.",
      lookup: false,
    },
    {
      name: "support-request",
      message: "Please send a support ticket about the product page for PETG.",
      lookup: false,
    },
    {
      name: "broken-page-help",
      message: "Please show me why the product page for PETG is broken.",
      lookup: false,
    },
  ])("$name", ({ message, lookup }) => {
    expect(prepareProductLinkStep(message, 0)).toEqual(
      lookup
        ? { toolChoice: { type: "tool", toolName: "searchProducts" } }
        : undefined,
    );
  });
});

describe("lookup and handoff intent boundaries", () => {
  it.each([
    "Please send us a product link for PETG.",
    "Send me the product page for PETG. Don’t share my personal details.",
    "Send me the product page for PETG. Don't fetch customer records.",
    "Show me the product page for PETG. No need to run benchmarks.",
    "Give me the product URL for PETG. Don't look at my account.",
    "Show me product pages for PETG. Avoid showing prices.",
    "Share a product link for PETG without sharing personal details.",
    "Send a product URL for PETG. Don't show my address.",
  ])("keeps a direct lookup when another action is declined: %s", (message) => {
    expect(prepareProductLinkStep(message, 0)?.toolChoice.toolName).toBe(
      "searchProducts",
    );
  });

  it.each([
    "Send me the product page for PETG without a product search.",
    "Show me the product link for PETG without doing another lookup.",
    "Show me the product page for PETG, but don't perform any new search.",
    "Send me the product URL for PETG. No need to look up products.",
    "Send me the product link for PETG. Avoid running a catalogue search.",
    "Show me the product page for PETG. Skip the lookup.",
    "Send me the product page for PETG. Don't share this product link.",
    "Show me the product page for PETG without sending me the link.",
    "Please send a support ticket about the product page for PETG.",
    "Could you please give me an explanation of the product page for PETG?",
    "Please share a summary of the product page for PETG.",
    "Show me troubleshooting steps for the product page for PETG.",
    "Find a support ticket about the product link for PETG.",
  ])(
    "does not force lookup for opt-outs or indirect requests: %s",
    (message) => {
      expect(prepareProductLinkStep(message, 0)).toBeUndefined();
    },
  );
});

it.each(["Browse catalogue", "Show me the products", "Please view the catalog."])("looks up an explicitly requested catalogue browse: %s", message => {
  expect(prepareProductLinkStep(message, 0)).toEqual({ toolChoice: { type: "tool", toolName: "searchProducts" } });
});
it("does not interpret a named product or an opt-out as catalogue browsing", () => {
  expect(prepareProductLinkStep("Browse catalogue without a search", 0)).toBeUndefined();
  expect(prepareProductLinkStep("Show me the products for PETG", 0)).toBeUndefined();
});


it.each(productLookupCases)("bounded routing decision: $status — $message", ({ message, status, allowed }) => {
  const decision = getProductLookupDecision(message);
  expect(decision).toEqual({ status, lookupAllowed: allowed });
  expect(prepareProductLinkStep(message, 0, decision)).toEqual(
    allowed ? { toolChoice: { type: "tool", toolName: "searchProducts" } } : undefined,
  );
  expect(prepareProductLinkStep(message, 1, decision)).toBeUndefined();
});
