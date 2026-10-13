import { resolveLocalKnowledgeFocus } from "../../src/app/api/ai-shopping-assistant/local-knowledge-focus";

const user = (content: string) => ({ role: "user" as const, content });
describe("local conversational source focus", () => {
  it("uses the explicit latest subject without inferring a physical variant", () => {
    const result = resolveLocalKnowledgeFocus([user("How do I dry TPU95-HF?")]);
    expect(result.mode).toBe("direct");
    expect(result.groupKey).toBe("five_E03");
    expect(result.question).toContain("TPU95-HF");
  });
  it("carries only a named subject and processing topic into a follow-up", () => {
    const result = resolveLocalKnowledgeFocus([
      user("Tell me about TPU95-HF drying."),
      { role: "assistant", content: "Invented recommendation: 99C." },
      user("What temperature and how many hours for it?"),
    ]);
    expect(result.mode).toBe("focused");
    expect(result.question).toContain("TPU95-HF");
    expect(result.question).toContain("drying");
    expect(result.question).not.toContain("99C");
  });
  it("requires clarification after a comparison instead of choosing one material", () => {
    const result = resolveLocalKnowledgeFocus([
      user("Compare TPU95-HF and PA6-CF20."),
      user("How do I dry it?"),
    ]);
    expect(result.mode).toBe("clarify");
    expect(result.reason).toBe("ambiguous_previous_subject");
    expect(result.subjects).toEqual(
      expect.arrayContaining(["TPU95-HF", "PA6-CF20"]),
    );
  });
  it("does not infer a subject from assistant output or customer history", () => {
    const result = resolveLocalKnowledgeFocus([
      user(
        "My order order_fixture123 had V6 Pro socks and email fake@example.com.",
      ),
      { role: "assistant", content: "You have V6 Pro socks." },
      user("Will it fit my K1?"),
    ]);
    expect(result.mode).toBe("clarify");
    expect(result.reason).toBe("missing_previous_subject");
  });
  it("keeps an explicit material switch separate from earlier HF focus", () => {
    const result = resolveLocalKnowledgeFocus([
      user("I am reading about TPU95-HF."),
      user("What about standard TPU95?"),
    ]);
    expect(result.mode).toBe("direct");
    expect(result.question).not.toContain("HF");
    expect(result.groupKey).toBeUndefined();
  });
  it("retains the named sock when the follow-up names a target machine", () => {
    const result = resolveLocalKnowledgeFocus([
      user("Tell me about E3D V6 Pro socks."),
      user("Will that work on my Creality K1?"),
    ]);
    expect(result.mode).toBe("focused");
    expect(result.groupKey).toBe("five_E10");
    expect(result.question).toContain("V6 Pro socks");
    expect(result.question).toContain("K1");
  });
});

describe("plural nozzle and sock follow-ups", () => {
  it("retains the named socks when the question says they", () => {
    const result = resolveLocalKnowledgeFocus([
      user("Tell me about V6 Pro socks."),
      user("Are they compatible with all hotend models?"),
    ]);
    expect(result.mode).toBe("focused");
    expect(result.groupKey).toBe("five_E10");
  });
  it("retains the V6 hardened nozzle family without selecting a K1 variant", () => {
    const result = resolveLocalKnowledgeFocus([
      user("Tell me about E3D V6 hardened steel nozzles."),
      user("Do all of these fit any K1 hotend?"),
    ]);
    expect(result.mode).toBe("focused");
    expect(result.question).toContain("V6 hardened-steel nozzle");
    expect(result.groupKey).toBeUndefined();
  });
});

describe("explicit named noun after possessive", () => {
  it("recognizes its Revo brass nozzle in a standalone question", () => {
    const result = resolveLocalKnowledgeFocus([
      user("What maximum temperature does E3D give for its Revo brass nozzle?"),
    ]);
    expect(result.mode).toBe("direct");
    expect(result.subjects).toEqual(["Revo brass nozzle"]);
  });
});


describe("public part reference focus", () => {
  it("keeps a named part before its package pronoun", () => {
    const result = resolveLocalKnowledgeFocus([user("What does Creality part 4007010136 contain in its manufacturer package?")]);
    expect(result.mode).toBe("direct");
    expect(result.subjects).toEqual(["Creality part 4007010136"]);
    expect(result.groupKey).toBeUndefined();
  });
  it("carries the replacement part identity without inferring a physical SKU", () => {
    const result = resolveLocalKnowledgeFocus([user("Part 4007010136."), user("Instead I need 4001040056."), user("What is its voltage?")]);
    expect(result.mode).toBe("focused");
    expect(result.subjects).toEqual(["Creality part 4001040056"]);
    expect(result.question).not.toContain("4007010136");
  });
  it("clarifies a follow-up to two distinct part references", () => {
    const result = resolveLocalKnowledgeFocus([user("Compare 4001030132 and 4001030147."), user("Will it fit?")]);
    expect(result.mode).toBe("clarify");
  });
});
