import { supplierBomComparisonRequested } from "../../src/app/api/ai-shopping-assistant/supplier-bom-intent";
import { resolveLocalKnowledgeFocus } from "../../src/app/api/ai-shopping-assistant/local-knowledge-focus";

it("routes explicit supplier hardware comparison without opening an official manual path", () => {
  expect(
    supplierBomComparisonRequested(
      "Compare 3DMakerParts supplier BOMs for Landy and Buggy/Buggster/Sandy",
    ),
  ).toBe(true);
});
it.each([
  "Where is the official 3D Sets Landy build guide?",
  "Show the 3DMakerParts Landy and Sandy BOMs and assembly manual",
  "What does the official Landy FAQ say about the 3DMakerParts Buggy BOM?",
  "Do 3DMakerParts Landy and Sandy BOMs prove WES2488 contents?",
])("keeps official/manual/SKU query scoped: %s", (question) => {
  expect(supplierBomComparisonRequested(question)).toBe(false);
});
it("retains a named CM2 nozzle rather than its generic hotend alias", () => {
  const focused = resolveLocalKnowledgeFocus([
    {
      role: "user",
      content: "Tell me about the Micro Swiss FlowTech CM2 nozzle",
    },
    { role: "assistant", content: "Invented entire-printer 450C rating" },
    { role: "user", content: "What is its tip material?" },
  ]);
  expect(focused.mode).toBe("focused");
  expect(focused.groupKey).toBe("catalogue_flowtech_cm2_04");
  expect(focused.question).not.toContain("Invented");
});
it("retains the PP adhesive reference in a bounded user follow-up", () => {
  expect(
    resolveLocalKnowledgeFocus([
      { role: "user", content: "Tell me about Magigoo PP" },
      { role: "user", content: "What is its dated reference price?" },
    ]).groupKey,
  ).toBe("catalogue_magigoo_pp50");
});
