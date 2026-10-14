import cases from "../../../../scripts/local-knowledge/evaluation/catalogue100-integration-focus-cases-v1.json";
import { resolveLocalKnowledgeFocus } from "../../src/app/api/ai-shopping-assistant/local-knowledge-focus";

it.each(cases.cases)(
  "preserves the reviewed identity for $id",
  ({ questions, expected_group }) => {
    const focus = resolveLocalKnowledgeFocus(
      questions.map((content) => ({ role: "user" as const, content })),
    );
    expect(focus.mode).toBe("focused");
    expect(focus.groupKey).toBe(expected_group);
    if (expected_group.includes("roto")) {
      expect(focus.question).toContain("E3D Roto motor");
      expect(focus.question).not.toContain("Magigoo");
    } else {
      expect(focus.question).toContain("Fiberlogy ASA");
    }
  },
);
