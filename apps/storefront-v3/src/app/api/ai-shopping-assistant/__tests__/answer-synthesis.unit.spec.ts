/** @jest-environment node */
import type { TextStreamPart, ToolSet } from "ai";
import observed from "../__fixtures__/observed-answer-repetition.json";
import { createKnowledgeExecution } from "../knowledge-execution";
import {
  assembleKnowledgeAnswer,
  createKnowledgeGroundingTransform,
} from "../knowledge-grounding";

const now = Date.parse(observed.provenance.observedAt);
const dragonfly = observed.cases[0];
const magigoo = observed.cases[1];
const customerMagigooAnswer = "Magigoo Original is designed and tested for PLA, ABS, PETG, HIPS and TPU on glass build plates.";
const clone = (value: unknown) => JSON.parse(JSON.stringify(value));
async function execute(
  value = dragonfly.knowledge,
  question = dragonfly.prompt,
) {
  const execution = createKnowledgeExecution(
    async () => value,
    () => now,
  );
  await execution.execute({ query: question }, { toolCallId: "recorded" });
  return execution;
}
beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(now));
afterEach(() => jest.restoreAllMocks());

it("consolidates the recorded component/system qualifications into one safety paragraph and one setup question", async () => {
  const input = clone(dragonfly.knowledge);
  const before = JSON.stringify(input);
  const answer = assembleKnowledgeAnswer(
    await execute(input),
    dragonfly.prompt,
    now,
  );
  expect(answer.text).toBe(dragonfly.expectedAfter);
  expect(answer.text.match(/Installed max temperature/g)).toHaveLength(1);
  for (const hardware of ["heater", "sensor", "wiring", "firmware"])
    expect(answer.text.match(new RegExp(hardware, "g"))).toHaveLength(1);
  expect(answer.text).toMatch(/component rating.*installed printer/);
  expect(answer.text).toContain("unknown");
  expect(answer.text.match(/\?/g)).toHaveLength(1);
  expect(answer.text).toContain("Which printer model");
  expect(answer.text).not.toMatch(
    /These details apply|not confirm a specific variant|This does not establish an assembled printer/,
  );
  expect(answer.text.length).toBeLessThan(dragonfly.before.length * 0.75);
  expect(JSON.stringify(input)).toBe(before);
  expect(answer.sources[0]).toMatchObject({
    url: input.documents[0].source_url,
    title: expect.stringContaining("model-level"),
  });
});
it("answers the recorded materials question without an unrelated variant or installation disclaimer", async () => {
  const answer = assembleKnowledgeAnswer(
    await execute(magigoo.knowledge, magigoo.prompt),
    magigoo.prompt,
    now,
  );
  expect(answer.text).toBe(
    customerMagigooAnswer,
  );
  expect(answer.sources).toHaveLength(1);
  expect(answer.sources[0]).toMatchObject({
    url: magigoo.observedSources[0].url,
    title: magigoo.observedSources[0].title,
  });
});
it("retains distinct unknowns when the installed limit is consolidated", async () => {
  const answer = assembleKnowledgeAnswer(
    await execute(),
    "What are all the specifications?",
    now,
  );
  expect(answer.text).toContain("Colour");
  expect(answer.text).toContain("Kit contents");
  expect(answer.text.match(/Installed max temperature/g)).toHaveLength(1);
  expect(answer.text).toContain("unknown");
});
it("retains a specific exact-variant label without generic installation boilerplate", async () => {
  const input = clone(magigoo.knowledge);
  input.documents[0].binding_scope = "variant";
  input.documents[0].variant_id = "variant_fixture";
  input.citations[0].binding_scope = "variant";
  input.citations[0].variant_id = "variant_fixture";
  const answer = assembleKnowledgeAnswer(
    await execute(input, magigoo.prompt),
    magigoo.prompt,
    now,
  );
  expect(answer.text).toContain("For variant variant\\_fixture only.");
  expect(answer.text).not.toContain("installation");
  expect(answer.sources[0].title).toContain("variant variant_fixture");
});
it.each([
  "unrecognized qualifier",
  "condition after qualifier",
  "literal link and code",
])("never heuristically strips %s from an approved value", async (kind) => {
  const input = clone(dragonfly.knowledge);
  const fact = input.documents[0].facts.find(
    (f: { field: string }) => f.field === "component_temperature_headline",
  )!;
  const original = fact.value;
  fact.value =
    kind === "unrecognized qualifier"
      ? "Synthetic component rating only under the manufacturer's documented cooling condition."
      : kind === "condition after qualifier"
        ? original + " Use only with the documented cooling arrangement."
        : "Literal https://manufacturer.example/manual(v1)?q=[x] and `component.limit` must be preserved.";
  fact.evidence_excerpt = fact.value;
  input.documents[0].text += "\n" + fact.value;
  const answer = assembleKnowledgeAnswer(
    await execute(input),
    dragonfly.prompt,
    now,
  );
  expect(answer.text).toContain(
    kind === "literal link and code" ? "component.limit" : fact.value,
  );
  if (kind === "literal link and code")
    expect(answer.text).toContain(
      "https://manufacturer.example/manual(v1)?q=\\[x\\]",
    );
});
it("still rejects expiry and mismatched citation revisions instead of using shortened facts", async () => {
  for (const reason of ["expired", "revision"]) {
    const input = clone(dragonfly.knowledge);
    if (reason === "expired")
      input.documents[0].valid_until = new Date(now).toISOString();
    else input.citations[0].revision_hash = "f".repeat(64);
    const answer = assembleKnowledgeAnswer(
      await execute(input),
      dragonfly.prompt,
      now,
    );
    expect(answer.text).not.toContain("500");
    expect(answer.text).toContain("can't confirm");
    expect(answer.sources).toEqual([]);
  }
});
it.each(observed.cases)(
  "emits the $id source only after the complete compact answer",
  async (fixture) => {
    type Part = TextStreamPart<ToolSet>;
    const execution = await execute(fixture.knowledge, fixture.prompt);
    const transform = createKnowledgeGroundingTransform(
      execution,
      [],
      {},
      { question: fixture.prompt },
    )();
    const reading = (async () => {
      const parts: Part[] = [];
      const reader = transform.readable.getReader();
      for (;;) {
        const next = await reader.read();
        if (next.done) return parts;
        parts.push(next.value);
      }
    })();
    const writer = transform.writable.getWriter();
    await writer.write({
      type: "text-delta",
      id: "model",
      text: "Every printer is definitely safe.",
    } as Part);
    await writer.write({ type: "finish", finishReason: "stop" } as Part);
    await writer.close();
    const parts = await reading;
    expect(parts.findIndex((p) => p.type === "source")).toBeGreaterThan(
      parts.findIndex((p) => p.type === "text-end"),
    );
    expect(parts.filter((p) => p.type === "source")).toHaveLength(1);
    const answer = parts
      .flatMap((p) => (p.type === "text-delta" ? [p.text] : []))
      .join("");
    expect(answer).toBe(fixture.id === magigoo.id ? customerMagigooAnswer : fixture.expectedAfter);
    expect(answer).not.toContain("definitely safe");
    expect(answer).not.toContain(fixture.knowledge.documents[0].source_url);
  },
);

it("does not shorten a qualification when there is no consolidated unknown-limit paragraph", async () => {
  const input = clone(dragonfly.knowledge);
  const doc = input.documents[0];
  const limit = doc.facts.find(
    (fact: { field: string }) => fact.field === "installed_max_temperature",
  )!;
  limit.value = "Synthetic limit in a separate documented configuration";
  limit.evidence_excerpt = limit.value;
  doc.text += "\n" + limit.value;
  const original = doc.facts.find(
    (fact: { field: string }) =>
      fact.field === "component_temperature_headline",
  )!.value;
  const answer = assembleKnowledgeAnswer(
    await execute(input),
    dragonfly.prompt,
    now,
  );
  expect(answer.text).toContain(original);
  expect(answer.text).not.toContain(
    "Installed max temperature remains unknown",
  );
});
