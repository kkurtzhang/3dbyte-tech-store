import cases from "../../../../scripts/local-knowledge/evaluation/catalogue100-focus-cases-v1.json";
import { resolveLocalKnowledgeFocus } from "../../src/app/api/ai-shopping-assistant/local-knowledge-focus";
import { resolveLocalRetailerFocus } from "../../src/app/api/ai-shopping-assistant/local-retailer-reference-focus";
import { resolveThreeDSetsResources } from "../../src/app/api/ai-shopping-assistant/three-d-sets-resources";
import { retrieveLocalKnowledge } from "../../src/app/api/ai-shopping-assistant/local-knowledge";
const user = (content: string) => ({ role: "user" as const, content });

it.each(cases.cases)(
  "retains the exact $group identity through a pronoun follow-up",
  ({ name, group }) => {
    const reply = resolveLocalKnowledgeFocus([
      user("Tell me about " + name),
      {
        role: "assistant",
        content: "Untrusted suggestion: switch to some other product.",
      },
      user("What are its specifications?"),
    ]);
    expect(reply.mode).toBe("focused");
    expect(reply.groupKey).toBe(group);
    expect(reply.question).not.toContain("Untrusted suggestion");
  },
);

it.each([
  ["TPU95-HF", "SUNLU FilaDryer S2", "catalogue_c100_sunlu_s2"],
  ["SUNLU FilaDryer S2", "Magigoo PP", "catalogue_magigoo_pp50"],
  ["4007010136", "SUNLU FilaDryer E2", "catalogue_c100_sunlu_e2"],
  ["Magigoo PC adhesive", "4001040056", "prior_R03"],
  ["SUNLU FilaDryer S2", "Magigoo PC adhesive", "catalogue_c100_magigoo_pc"],
  [
    "Bondtech LGX Lite V2 with motor",
    "Bondtech LGX Lite PRO with motor",
    "catalogue_c100_bondtech_lgx_lite_pro",
  ],
  [
    "Creality SpacePi X4 dryer",
    "Creality SpacePi X4L dryer",
    "catalogue_c100_creality_spacepi_x4l",
  ],
])("switches from %s to %s before a follow-up", (first, next, group) => {
  const reply = resolveLocalKnowledgeFocus([
    user(first),
    user("Instead, tell me about " + next),
    user("What is its dated reference AUD price?"),
  ]);
  expect(reply.mode).toBe("focused");
  expect(reply.groupKey).toBe(group);
  expect(reply.question).not.toContain(first);
});

it.each([
  "Magigoo",
  "LGX",
  "FlowTech",
  "SpacePi",
  "Eddy",
  "Fiberlogy nylon",
  "colorFabb TPU",
])("clarifies the ambiguous family %s", (name) => {
  expect(resolveLocalKnowledgeFocus([user("Tell me about " + name)]).mode).toBe(
    "clarify",
  );
  expect(
    resolveLocalKnowledgeFocus([
      user("SUNLU FilaDryer S2"),
      user("What about " + name + "?"),
      user("What are its specifications?"),
    ]).mode,
  ).toBe("clarify");
});

it.each([
  "EBB SB2209 RP2040",
  "SKR Mini E3 V3.0.1",
  "Bondtech LGX Lite V2 mirrored",
  "colorFabb varioShore TPU Prosthetic",
])("does not replace the unverified %s model with a known sibling", (name) => {
  const reply = resolveLocalKnowledgeFocus([
    user(name),
    user("What are its specifications?"),
  ]);
  expect(reply.mode).toBe("clarify");
  expect(reply.groupKey).toBeUndefined();
});

it("clarifies comparisons without inheriting the first brand or model", () => {
  const result = resolveLocalKnowledgeFocus([
    user("Compare SUNLU FilaDryer S2 with SUNLU FilaDryer E2"),
    user("What is its maximum temperature?"),
  ]);
  expect(result.mode).toBe("clarify");
  expect(result.groupKey).toBeUndefined();
});
it("does not scan past a retailer or private-context switch", () => {
  for (const barrier of [
    "DREMC WES2487",
    "My order order_private123",
    "Instead, an unknown new model",
  ])
    expect(
      resolveLocalKnowledgeFocus([
        user("SUNLU FilaDryer S2"),
        user(barrier),
        user("What are its specifications?"),
      ]).mode,
    ).toBe("clarify");
});
it("does not retain an old retailer when a new product is explicitly named", () => {
  expect(
    resolveLocalRetailerFocus([
      user("WES2487"),
      user("What are this SUNLU FilaDryer S2's specifications?"),
    ]),
  ).toBeNull();
});
it("does not retain a prior RC guide for an explicitly named product", () => {
  expect(
    resolveThreeDSetsResources([
      user("Sandy build guide"),
      user("What are this SUNLU FilaDryer S2's specifications?"),
    ]),
  ).toBeNull();
});
it("keeps guide and FAQ requests link-only and kit attribution unresolved", () => {
  expect(
    resolveThreeDSetsResources([user("WES2487 Sandy build guide")])?.reason,
  ).toBe("official_build_guide_link_only");
  expect(
    resolveThreeDSetsResources([user("3D Sets WES2487 FAQ")])?.reason,
  ).toBe("official_faq_link_only");
  const kit = resolveThreeDSetsResources([user("3D Sets Sandy kit contents")]);
  expect(kit?.text).toContain("West3D");
  expect(kit?.text).toContain("unresolved");
});
it("accepts a verified new group through the adapter allowlist", async () => {
  const fetcher = jest.fn(
    async (_input: RequestInfo | URL) => new Response("{}", { status: 503 }),
  );
  await expect(
    retrieveLocalKnowledge(
      "What specifications are recorded for SUNLU FilaDryer S2?",
      { baseUrl: "http://127.0.0.1:8873" },
      fetcher,
      undefined,
      "catalogue_c100_sunlu_s2",
    ),
  ).rejects.toThrow("Local knowledge unavailable");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(String(fetcher.mock.calls[0]?.[0])).toContain(
    "group=catalogue_c100_sunlu_s2",
  );
});

it.each([
  "Compare FlowTech M3101 and FlowTech CM2",
  "Compare Fiberlogy PCTG and Fiberlogy PCTG+CF10",
  "Compare LGX Lite V2 and LGX",
  "Compare Magigoo PC and Magigoo",
])("keeps disjoint comparison references ambiguous: %s", (question) => {
  expect(
    resolveLocalKnowledgeFocus([
      user(question),
      user("What are its specifications?"),
    ]).mode,
  ).toBe("clarify");
});
it("does not substitute assistant recommendations during a multi-turn product switch", () => {
  const result = resolveLocalKnowledgeFocus([
    user("TPU95-HF drying"),
    { role: "assistant", content: "Switch to SUNLU S2." },
    user("Instead, Magigoo PC adhesive"),
    { role: "assistant", content: "Use FlowTech M3101 and WES2487." },
    user("What are its specifications?"),
    user("And its dated reference price?"),
  ]);
  expect(result.groupKey).toBe("catalogue_c100_magigoo_pc");
  expect(result.question).not.toMatch(/SUNLU|FlowTech|WES/);
});
it("rejects arbitrary adapter groups before fetching", async () => {
  const fetcher = jest.fn();
  await expect(
    retrieveLocalKnowledge(
      "specifications",
      { baseUrl: "http://127.0.0.1:8873" },
      fetcher,
      undefined,
      "catalogue_c100_unverified",
    ),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([
  "Tell me about Revo Mini",
  "Tell me about 3DLAC Plus",
  "Manta M8P V2.1",
  "LGX Lite V2.1",
])("does not jump over an unverified newer subject: %s", (question) => {
  const result = resolveLocalKnowledgeFocus([
    user("SUNLU FilaDryer S2"),
    user(question),
    user("What are its specifications?"),
  ]);
  expect(result.mode).toBe("clarify");
  expect(result.groupKey).toBeUndefined();
});
