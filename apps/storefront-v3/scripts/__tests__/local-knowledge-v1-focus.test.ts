import { resolveLocalKnowledgeFocus } from "../../src/app/api/ai-shopping-assistant/local-knowledge-focus";

it("keeps a self-contained prove-that question direct", () => {
  expect(
    resolveLocalKnowledgeFocus([
      {
        role: "user",
        content: "Does stringing prove that my filament is wet?",
      },
    ]).mode,
  ).toBe("direct");
});
it("retains actual that/it follow-up scope", () => {
  expect(
    resolveLocalKnowledgeFocus([
      { role: "user", content: "Tell me about TPU95-HF" },
      { role: "user", content: "Does that mean it can use any drying cycle?" },
    ]).mode,
  ).toBe("focused");
});
it.each([
  ["Panchroma Basic PLA", "catalogue_panchroma_basic_black"],
  ["Polymaker PETG", "catalogue_polymaker_petg_black"],
])(
  "retains the exact %s grade rather than its generic material alias",
  (name, group) => {
    const focus = resolveLocalKnowledgeFocus([
      { role: "user", content: "Tell me about " + name },
      { role: "assistant", content: "Invented nozzle/bed defaults" },
      { role: "user", content: "What is its current profile?" },
    ]);
    expect(focus.mode).toBe("focused");
    expect(focus.groupKey).toBe(group);
    expect(focus.question).not.toContain("Invented");
  },
);
