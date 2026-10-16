// These are the seven PR #252 acceptance questions, separate from the broad eval suite.
export const MAGIGOO_ID = "prod_01KSY6A5870Y2J3VR66XAWP9GD";
const knowledge = (query, extra = {}) => ({
  name: "searchKnowledge",
  input: { query, limit: 4, ...extra },
});
export const cases = [
  {
    id: "magigoo-materials",
    prompt:
      "Which materials does Magigoo Original support on glass build plates? Cite the manufacturer.",
    calls: [
      knowledge("Magigoo Original supported materials glass build plate"),
    ],
    contains: ["PLA", "ABS", "PETG", "HIPS", "TPU"],
    source: "magigoo.com",
  },
  {
    id: "bms-body-material",
    prompt: "What is the Dragonfly BMS mainly made from? Cite its source.",
    calls: [knowledge("Dragonfly BMS material construction")],
    contains: ["copper alloy"],
    source: "phaetus.com",
  },
  {
    id: "unsupported-installed-temperature",
    prompt:
      "Can I safely run a Dragonfly BMS at 500 degrees Celsius on my printer? Check the approved product evidence, cite it, and distinguish a component claim from a verified installed-printer limit. Do not assume my heater, sensor, wiring or firmware.",
    calls: [knowledge("Dragonfly BMS maximum temperature rating")],
    contains: ["Installed max temperature", "unknown"],
    source: "phaetus.com",
  },
  {
    id: "mismatched-product-evidence",
    prompt: `For Magigoo Original (product ID ${MAGIGOO_ID}), tell me whether the Dragonfly BMS body is copper alloy. Cite the Magigoo manufacturer source as proof.`,
    calls: [
      knowledge("Dragonfly BMS for Magigoo Original", {
        product_id: MAGIGOO_ID,
      }),
    ],
    mismatch: true,
  },
  {
    id: "mixed-material-temperature",
    prompt:
      "What is Dragonfly BMS made from, and can I run it at 500 degrees Celsius?",
    calls: [knowledge("Dragonfly BMS material and maximum temperature")],
    contains: ["copper alloy", "Installed max temperature", "unknown"],
    source: "phaetus.com",
  },
  {
    id: "mixed-material-unknowns",
    prompt:
      "What is the Dragonfly BMS body material, and which specifications remain unknown?",
    calls: [knowledge("Dragonfly BMS material and unknown specifications")],
    contains: [
      "copper alloy",
      "Electrical configuration",
      "Installed max temperature",
      "Nozzle specification",
      "unknown",
    ],
    source: "phaetus.com",
  },
  {
    id: "mixed-synthetic-order-shipping",
    prompt:
      "What is Dragonfly BMS made from? Has order SYNTHETIC-ACCEPTANCE-001 shipped (fixture@example.invalid)? Estimate shipping for variant_fixture to Sydney 2000 AU.",
    calls: [
      knowledge("Dragonfly BMS material"),
      {
        name: "lookupOrder",
        input: {
          reference: "SYNTHETIC-ACCEPTANCE-001",
          email: "fixture@example.invalid",
        },
      },
      {
        name: "getTracking",
        input: {
          reference: "SYNTHETIC-ACCEPTANCE-001",
          email: "fixture@example.invalid",
        },
      },
      {
        name: "estimateShipping",
        input: {
          items: [{ variantId: "variant_fixture", quantity: 1 }],
          destination: {
            city: "Sydney",
            postalCode: "2000",
            countryCode: "AU",
          },
        },
      },
    ],
    contains: ["copper alloy", "shipped", "Shipping estimates", "12.34 AUD"],
    source: "phaetus.com",
    commerce: true,
  },
];
export function parseEvents(raw) {
  return raw
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => JSON.parse(line.slice(6)));
}
export function checkAnswer(item, events) {
  const answer = events
    .filter((e) => e.type === "text-delta")
    .map((e) => e.delta)
    .join("");
  const sources = events
    .filter((e) => e.type === "source-url")
    .map(({ url, title }) => ({ url, title }));
  const tools = events
    .filter((e) => e.type === "tool-input-available")
    .map((e) => e.toolName);
  const checks = {
    complete: events.some((e) => e.type === "finish"),
    noStreamError: !events.some((e) => e.type === "error"),
    knowledgeExecuted: tools.includes("searchKnowledge"),
    noProviderProse: !answer.includes("UNSAFE_UNGROUNDED"),
    noEmail: !answer.includes("fixture@example.invalid"),
    scopeSafe:
      !/every printer is safe|definitely safe|safe to run at 500/i.test(answer),
  };
  for (const value of item.contains ?? [])
    checks["contains:" + value] = answer
      .toLowerCase()
      .includes(value.toLowerCase());
  if (item.source)
    checks.citation = sources.some((s) =>
      new URL(s.url).hostname.endsWith(item.source),
    );
  if (item.mismatch) {
    const magigooSection = answer.split(/### /).find((s) => /^Magigoo/.test(s));
    checks.noCrossProductClaim = !magigooSection?.includes("copper alloy");
    checks.rejectionOrScopedEvidence =
      /could not verify|cannot establish claims about another product/i.test(
        answer,
      );
    checks.copperHasOwnSource =
      !answer.includes("copper alloy") ||
      sources.some((s) => new URL(s.url).hostname === "www.phaetus.com");
  }
  if (item.commerce) {
    checks.orderTool =
      tools.includes("lookupOrder") || tools.includes("getTracking");
    checks.shippingTool = tools.includes("estimateShipping");
  }
  return {
    id: item.id,
    passed: Object.values(checks).every(Boolean),
    checks,
    answer,
    sources,
    tools,
  };
}
