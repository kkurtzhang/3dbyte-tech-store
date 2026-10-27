/** @jest-environment node */
import type { TextStreamPart, ToolSet } from "ai";
import observed from "../__fixtures__/observed-knowledge-answers.json";
import {
  createKnowledgeExecution,
  validateKnowledgeResult,
} from "../knowledge-execution";
import {
  assembleKnowledgeAnswer,
  createKnowledgeGroundingTransform,
} from "../knowledge-grounding";

async function collect<T>(stream: ReadableStream<T>) {
  const reader = stream.getReader();
  const result: T[] = [];
  for (;;) {
    const next = await reader.read();
    if (next.done) return result;
    result.push(next.value);
  }
}

const now = Date.parse(observed.provenance.observedAt);
const fixture = observed.cases.find((item) => item.id === "bms-body-material")!;
const raw = () => structuredClone(fixture.toolOutputs[0].output);
const query = { query: "Dragonfly BMS" };
function execution(...results: ReturnType<typeof raw>[]) {
  return {
    results: new Map(
      results.map((result, index) => [
        String(index),
        validateKnowledgeResult(result, query, now)!,
      ]),
    ),
  };
}

it("answers directly with approved sentences and keeps all attribution outside the prose", () => {
  const answer = assembleKnowledgeAnswer(
    execution(raw()),
    "What is Dragonfly BMS made of?",
    now,
  );
  expect(answer.text).toContain(
    "Phaetus describes Dragonfly BMS construction as mainly copper alloy.",
  );
  expect(answer.text).not.toMatch(
    /Here are the current approved facts|Source:|Official Product Page|document_id|revision_hash/,
  );
  expect(answer.text).not.toContain(
    "**Manufacturer body-material statement:**",
  );
  expect(answer.text).not.toContain("Installed max temperature");
  expect(answer.text).not.toContain("heater");
  expect(answer.sources[0].title).toContain(
    "Manufacturer body-material statement",
  );
  expect(answer.sources[0].title).toContain(
    "Phaetus Dragonfly Hotend BMS Official Product Page",
  );
  expect(answer.sources[0].url).toBe(raw().documents![0].source_url);
});

it("treats conflicting same-product facts as unresolved and keeps both sources for review", () => {
  const first = raw();
  const second = raw();
  const doc = second.documents![0];
  doc.document_id = "conflicting_document";
  doc.document_title = "Conflicting material document";
  doc.source_url = "https://source.example/conflicting";
  doc.facts[0].value = "Synthetic conflicting material.";
  doc.facts[0].evidence_excerpt = doc.facts[0].value;
  doc.text += "\n" + doc.facts[0].value;
  Object.assign(second.citations![0], {
    document_id: doc.document_id,
    title: doc.document_title,
    source_url: doc.source_url,
  });
  const answer = assembleKnowledgeAnswer(
    execution(first, second),
    "What is it made from?",
    now,
  );
  expect(answer.text).toContain("Conflicting evidence");
  expect(answer.text).toContain("Manufacturer body-material statement");
  expect(answer.text).toContain("can\'t confirm");
  expect(answer.text).not.toMatch(
    /mainly copper|Synthetic conflicting material/,
  );
  expect(answer.sources).toHaveLength(2);
  expect(answer.sources.map((source) => source.title).join(" ")).toContain(
    doc.document_title,
  );
});

it("deduplicates final URLs without dropping the distinct document and claim associations", () => {
  const first = raw();
  const second = raw();
  second.documents![0].document_id = "second_document";
  second.documents![0].document_title = "Second approved document";
  Object.assign(second.citations![0], {
    document_id: "second_document",
    title: "Second approved document",
  });
  const answer = assembleKnowledgeAnswer(
    execution(first, second),
    "What is BMS made of?",
    now,
  );
  expect(answer.sources).toHaveLength(1);
  expect(answer.sources[0].title).toContain("Second approved document");
  expect(answer.sources[0].title).toContain(
    "Manufacturer body-material statement",
  );
  expect(answer.text.match(/mainly copper alloy/g)).toHaveLength(1);
});

it("keeps absent evidence unknown without manufacturing a Sources entry", () => {
  const answer = assembleKnowledgeAnswer(
    { results: new Map([["missing", null]]) },
    "Can it run at 500°C?",
    now,
  );
  expect(answer.text).toContain("can\'t confirm");
  expect(answer.sources).toEqual([]);
});

it("prioritizes the unresolved installed limit for a natural temperature question", () => {
  const answer = assembleKnowledgeAnswer(
    execution(raw()),
    "Can I run my Dragonfly BMS at 500°C?",
    now,
  );
  expect(answer.text).toContain("Installed max temperature");
  expect(answer.text).not.toContain("mainly copper");
  expect(answer.text).toMatch(/component rating.*installed printer/);
  for (const requirement of ["heater", "sensor", "wiring", "firmware"])
    expect(answer.text).toContain(requirement);
});

it("emits validated source parts only after all answer text, without rewriting functional links or code", async () => {
  jest.spyOn(Date, "now").mockReturnValue(now);
  try {
    type Part = TextStreamPart<ToolSet>;
    const knowledge = createKnowledgeExecution(
      async () => raw(),
      () => now,
    );
    await knowledge.execute(query, { toolCallId: "call" });
    const chunks = [
      { type: "text-delta", id: "model", text: "Unsupported answer [1]." },
      {
        type: "source",
        sourceType: "url",
        id: "forged",
        url: "https://invented.example",
        title: "Invented",
      },
      { type: "finish", finishReason: "stop" },
    ] as Part[];
    const output = await collect(
      new ReadableStream<Part>({
        start(controller) {
          chunks.forEach((chunk) => controller.enqueue(chunk));
          controller.close();
        },
      }).pipeThrough(createKnowledgeGroundingTransform(knowledge, [])()),
    );
    expect(output.findIndex((part) => part.type === "source")).toBeGreaterThan(
      output.findIndex((part) => part.type === "text-end"),
    );
    expect(JSON.stringify(output)).not.toMatch(
      /invented.example|Unsupported answer/,
    );
    const ordinary =
      "See [product](https://store.example/products/a?q=(x)) and `array[1]`.";
    const noKnowledge = createKnowledgeExecution(
      async () => raw(),
      () => now,
    );
    const normal = await collect(
      new ReadableStream<Part>({
        start(controller) {
          controller.enqueue({
            type: "text-delta",
            id: "model",
            text: ordinary,
          });
          controller.enqueue(chunks[2]);
          controller.close();
        },
      }).pipeThrough(createKnowledgeGroundingTransform(noKnowledge, [])()),
    );
    expect(
      normal
        .flatMap((part) => (part.type === "text-delta" ? [part.text] : []))
        .join(""),
    ).toBe(ordinary);
    expect(normal.some((part) => part.type === "source")).toBe(false);
  } finally {
    jest.restoreAllMocks();
  }
});

it("keeps sibling variants and model-level evidence separate instead of inventing a conflict", () => {
  const model = raw();
  const variant = raw();
  const doc = variant.documents![0];
  Object.assign(doc, {
    document_id: "variant_document",
    binding_scope: "variant",
    variant_id: "variant_a",
  });
  doc.facts[0].value = "Variant-specific synthetic material.";
  doc.facts[0].evidence_excerpt = doc.facts[0].value;
  doc.text += "\n" + doc.facts[0].value;
  Object.assign(variant.citations![0], {
    document_id: doc.document_id,
    binding_scope: "variant",
    variant_id: "variant_a",
  });
  const result = assembleKnowledgeAnswer(
    execution(model, variant),
    "What is it made of?",
    now,
  );
  expect(result.text).toContain("mainly copper alloy");
  expect(result.text).toContain("Variant-specific synthetic material");
  expect(result.text).toContain("only to variant variant\\_a");
  expect(result.text).not.toContain("Conflicting evidence");
  expect(result.sources).toHaveLength(1);
  expect(result.sources[0].title).toContain("model-level");
  expect(result.sources[0].title).toContain("variant variant_a");
});

it("retains a label for scalar values and for evidence with no known facts", () => {
  const result = raw();
  const doc = result.documents![0];
  doc.facts = [
    {
      field: "rating",
      label: "Component rating",
      value: "300 °C.",
      evidence_excerpt: "300 °C.",
    },
  ];
  doc.text += "\n300 °C.";
  const scalar = assembleKnowledgeAnswer(
    execution(result),
    "What is the component rating?",
    now,
  );
  expect(scalar.text).toContain("Component rating: 300 °C.");
  doc.facts[0].value = null;
  doc.facts[0].evidence_excerpt = "";
  const unknown = assembleKnowledgeAnswer(
    execution(result),
    "What is the component rating?",
    now,
  );
  expect(unknown.text).toContain("Not established");
  expect(unknown.text).not.toContain("300");
  expect(unknown.sources[0].title).toContain(
    "Not established: Component rating",
  );
});

it("does not hide conflicting evidence beyond the four-document summary cap", () => {
  const results = Array.from({ length: 5 }, (_, index) => {
    const item = raw();
    const doc = item.documents![0];
    doc.document_id = `document_${index}`;
    doc.source_url = `https://source.example/document-${index}`;
    if (index === 4) {
      doc.facts[0].value = "Synthetic conflicting material.";
      doc.facts[0].evidence_excerpt = doc.facts[0].value;
      doc.text += "\n" + doc.facts[0].value;
    }
    Object.assign(item.citations![0], {
      document_id: doc.document_id,
      source_url: doc.source_url,
    });
    return item;
  });
  const answer = assembleKnowledgeAnswer(
    execution(...results),
    "What is BMS made from?",
    now,
  );
  expect(answer.text).toContain("Conflicting evidence");
  expect(answer.text).not.toContain("mainly copper");
  expect(answer.text).toContain("only four documents");
  expect(answer.sources.map((source) => source.url)).toContain(
    "https://source.example/document-4",
  );
});
