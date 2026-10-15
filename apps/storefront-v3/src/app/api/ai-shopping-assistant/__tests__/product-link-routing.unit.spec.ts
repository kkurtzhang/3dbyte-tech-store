import { prepareProductLinkStep } from "../product-link-routing";

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
