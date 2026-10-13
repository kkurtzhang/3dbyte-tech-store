import fs from "node:fs";
import { handleLocalKnowledgeChat } from "../../src/app/api/ai-shopping-assistant/local-knowledge-chat";
import { resolveLocalKnowledgeFocus } from "../../src/app/api/ai-shopping-assistant/local-knowledge-focus";

type OfflineCase = {
  case: {
    id: string;
    question: string;
    group: string;
    status: string;
    field: string;
  };
  reply: Record<string, unknown>;
};
const fixturePath = process.env.LOCAL_CATALOGUE_ROUTE_FIXTURES;
const fixtures: OfflineCase[] = fixturePath
  ? JSON.parse(fs.readFileSync(fixturePath, "utf8")).results
  : [];
const offlineDescribe = fixturePath ? describe : describe.skip;

type StreamEvent = {
  type: string;
  data?: {
    status: string;
    unknown_fields?: string[];
    context_assembly: { selected_claim_ids: string[] };
  };
  delta?: string;
  url?: string;
};
function events(raw: string): StreamEvent[] {
  return raw
    .split("\n")
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => JSON.parse(line.slice(6)));
}

const subjects = [
  ["FlowTech M3101", "catalogue_flowtech_m3101"],
  ["Orbiter v2.5", "catalogue_orbiter_v25"],
  ["Slice torque wrench", "catalogue_slice_torque_15"],
  ["BuildTak PEI", "catalogue_buildtak_pei235"],
  ["BuildTak Spatula", "catalogue_buildtak_spatula"],
  ["Fiberlogy PP", "catalogue_fiberlogy_pp750"],
];
it.each(subjects)(
  "retains only the user named %s identity through a follow-up",
  (name, group) => {
    const focus = resolveLocalKnowledgeFocus([
      { role: "user", content: "Tell me about " + name },
      { role: "assistant", content: "Invented facts about another product" },
      { role: "user", content: "What about its compatibility?" },
    ]);
    expect(focus.mode).toBe("focused");
    expect(focus.groupKey).toBe(group);
    expect(focus.question).not.toContain("Invented");
  },
);
it("asks for clarification after a two-product comparison", () => {
  expect(
    resolveLocalKnowledgeFocus([
      { role: "user", content: "Compare BuildTak PEI and BuildTak Spatula" },
      { role: "user", content: "What about its size?" },
    ]).mode,
  ).toBe("clarify");
});

offlineDescribe(
  "actual route handler with independently checked persisted offline context",
  () => {
    const savedEnv = process.env;
    const savedFetch = global.fetch;
    beforeEach(() => {
      process.env = {
        ...savedEnv,
        NODE_ENV: "development",
        AI_ASSISTANT_LOCAL_KNOWLEDGE: "1",
      };
    });
    afterEach(() => {
      process.env = savedEnv;
      global.fetch = savedFetch;
    });
    it.each(fixtures)(
      "streams persisted case $case.id without listening services",
      async (item) => {
        const messages = [
          ...(item.case.id ===
          "fiberlogy_pp750_legacy_spool_settings_applicability"
            ? [
                {
                  role: "user" as const,
                  content:
                    "What drying guidance does the current Fiberlogy PP family provide?",
                },
              ]
            : []),
          { role: "user" as const, content: item.case.question },
        ];
        const focusedQuestion = resolveLocalKnowledgeFocus(messages).question;
        global.fetch = jest.fn(async (input) => {
          const url = new URL(String(input));
          expect(url.origin).toBe("http://127.0.0.1:8873");
          expect(url.searchParams.get("q")).toBe(focusedQuestion);
          expect(url.searchParams.get("group")).toBe(item.case.group);
          return Response.json(item.reply);
        });
        const response = await handleLocalKnowledgeChat(
          new Request("http://127.0.0.1:3005/api/ai-shopping-assistant", {
            method: "POST",
            headers: {
              host: "127.0.0.1:3005",
              origin: "http://127.0.0.1:3005",
            },
            body: JSON.stringify({
              messages,
            }),
          }),
        );
        expect(response.status).toBe(200);
        const stream = events(await response.text());
        const context = stream.find(
          (event) => event.type === "data-local-knowledge",
        )!.data!;
        const rendered = stream
          .filter((event) => event.type === "text-delta")
          .map((event) => event.delta)
          .join("");
        const sources = stream.filter((event) => event.type === "source-url");
        expect(context.status).toBe(item.case.status);
        expect(rendered).toContain("No language model generation");
        expect(global.fetch).toHaveBeenCalledTimes(1);
        if (item.case.status === "unknown") {
          expect(context.unknown_fields).toContain(item.case.field);
          expect(sources).toHaveLength(0);
          expect(context.context_assembly.selected_claim_ids).toHaveLength(0);
        } else {
          expect(sources.length).toBeGreaterThan(0);
          const claim = (
            item.reply.context_pack as Array<{
              field: string;
              statement: string;
            }>
          ).find((claim) => claim.field === item.case.field)!;
          expect(rendered).toContain(claim.statement);
          for (const source of sources)
            expect(source.url).toMatch(/^https:\/\//);
        }
      },
    );
  },
);
