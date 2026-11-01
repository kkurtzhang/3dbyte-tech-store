/** @jest-environment node */
import observed from "../__fixtures__/observed-answer-repetition.json";
import { createKnowledgeExecution } from "../knowledge-execution";
import { assembleKnowledgeAnswer } from "../knowledge-grounding";
const now = Date.parse(observed.provenance.observedAt);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const ratingAnswer =
  "The 500°C figure is the hotend's stated heat-resistance rating. It does not establish a safe operating temperature for your printer; the heater, sensor, wiring and firmware limits still need checking.\n\nWhich printer model are you using, and has its hotend setup been modified?";
export const petgAnswer =
  "Check the PETG filament's printing requirements against your printer's hotend setup before choosing settings.\n\nWhich printer model are you using, and is its hotend setup still stock or modified?";
async function answer(question: string, data = observed.cases[0].knowledge) {
  const execution = createKnowledgeExecution(
    async () => data,
    () => now,
  );
  await execution.execute(
    { query: question },
    { toolCallId: "customer-revision" },
  );
  return assembleKnowledgeAnswer(execution, question, now);
}
it("replaces the exact rejected 500°C wording while retaining every safety boundary", async () => {
  expect(observed.cases[0].expectedAfter).toContain(
    "Phaetus advertises a 500°C component rating",
  );
  expect(observed.cases[0].expectedAfter).toContain(
    "Installed max temperature remains unknown",
  );
  const result = await answer("Can I run my Dragonfly BMS at 500°C?");
  expect(result.text).toBe(ratingAnswer);
  expect(result.text).not.toMatch(
    /advertises|Installed max temperature|I can.t confirm|approved|from this document/,
  );
  for (const hardware of ["heater", "sensor", "wiring", "firmware"])
    expect(result.text).toContain(hardware);
  expect(result.text).toContain(
    "does not establish a safe operating temperature",
  );
  expect(result.text.match(/\?/g)).toHaveLength(1);
  expect(result.sources).toHaveLength(1);
});
it("offers the useful PETG setup check without broad refusal or invented compatibility", async () => {
  const result = await answer("Can I print PETG with a Dragonfly BMS?");
  expect(result.text).toBe(petgAnswer);
  expect(result.text).not.toMatch(
    /can.t confirm|500|copper|firmware|works with PETG|safe for PETG|approved|document/,
  );
  expect(result.sources).toEqual([]);
});
it("replaces the quoted Magigoo answer with a direct supported material/surface statement", async () => {
  const result = await answer(
    "Which materials does Magigoo Original support on glass build plates?",
    observed.cases[1].knowledge,
  );
  expect(observed.cases[1].expectedAfter).toContain(
    "Magigoo describes Original",
  );
  expect(result.text).toBe(
    "Magigoo Original is designed and tested for PLA, ABS, PETG, HIPS and TPU on glass build plates.",
  );
  expect(result.sources[0].url).toBe(
    observed.cases[1].knowledge.documents[0].source_url,
  );
});
it("handles a different approved product and material list without product or source-URL aliases", async () => {
  const data = clone(observed.cases[1].knowledge);
  const doc = data.documents[0];
  doc.product_title = "FixtureBond Original 30ml Adhesive";
  doc.source_url = "https://fixture.example/material-scope";
  data.citations[0].source_url = doc.source_url;
  doc.facts = [
    {
      field: "material_scope",
      label: "Material and surface scope",
      value:
        "FixtureBond describes Original as designed and tested on glass build plates for PLA and TPU.",
      evidence_excerpt: "PLA and TPU",
    },
  ];
  doc.text = doc.facts[0].value!;
  const result = await answer(
    "Can I use FixtureBond Original for TPU on glass?",
    data,
  );
  expect(result.text).toBe(
    "FixtureBond Original is designed and tested for TPU on glass build plates.",
  );
  expect(result.text).not.toMatch(/Magigoo|Phaetus/);
  expect(result.sources[0].url).toBe(doc.source_url);
});
it("keeps an unrecognized thermal qualification in full", async () => {
  const data = clone(observed.cases[0].knowledge);
  const fact = data.documents[0].facts.find(
    (fact) => fact.field === "component_temperature_headline",
  )!;
  fact.value += " Only under a separately specified cooling condition.";
  fact.evidence_excerpt = fact.value!;
  data.documents[0].text += "\n" + fact.value;
  const result = await answer("Can I run my Dragonfly BMS at 500°C?", data);
  expect(result.text).toContain(
    "Only under a separately specified cooling condition.",
  );
  expect(result.text).not.toBe(ratingAnswer);
  expect(result.text).not.toMatch(/safe to run at 500/);
});

it("does not substitute the extreme hotend rating for ordinary PETG printing settings", async () => {
  const result = await answer(
    "What temperature should I use to print PETG with a Dragonfly BMS?",
  );
  expect(result.text).toBe(
    "Start with the filament manufacturer's settings for that exact material, then check your printer's operating limits before choosing a temperature.\n\nWhich filament brand/grade and printer setup are you using?",
  );
  expect(result.text).not.toMatch(/500|can.t confirm|advertises|unknown/);
  expect(result.sources).toEqual([]);
});

it("gives supported practical release guidance without dumping unrelated material or unknown fields", async () => {
  const result = await answer(
    "When does Magigoo Original release the print?",
    observed.cases[1].knowledge,
  );
  expect(result.text).toBe(
    "Magigoo Original 50ml Bed Adhesive is thermally activated: it holds the print on a hot bed and releases after cooling.",
  );
  expect(result.text).not.toMatch(
    /manufacturer|describes|PLA|Colour|Kit contents|can.t confirm/,
  );
  expect(result.sources).toHaveLength(1);
});
it("uses the approved rating for another hotend without a named-product or numeric alias", async () => {
  const data = clone(observed.cases[0].knowledge);
  const doc = data.documents[0];
  doc.product_title = "FixtureHeat Compact Hotend";
  doc.source_url = "https://fixture.example/heat-resistance";
  data.citations[0].source_url = doc.source_url;
  doc.facts = [
    {
      field: "component_temperature_rating",
      label: "Stated resistance rating",
      value: "FixtureHeat lists a 360°C component rating.",
      evidence_excerpt: "360°C",
    },
    {
      field: "installed_max_temperature",
      label: "Installed maximum",
      value: null,
      evidence_excerpt: "",
    },
  ];
  doc.text = doc.facts[0].value!;
  const result = await answer("Can I run this hotend at 360°C?", data);
  expect(result.text).toContain(
    "The 360°C figure is the hotend's stated heat-resistance rating.",
  );
  expect(result.text).toContain(
    "does not establish a safe operating temperature",
  );
  expect(result.text).not.toMatch(/500|Phaetus|Magigoo/);
});

it("keeps markup and code in an unrecognized source claim instead of reinterpreting it", async () => {
  const data = clone(observed.cases[1].knowledge);
  const doc = data.documents[0];
  const fact = doc.facts[0];
  fact.value = "Magigoo describes `Original` as designed and tested on glass build plates for PLA and TPU.";
  fact.evidence_excerpt = fact.value;
  doc.text += "\n" + fact.value;
  const result = await answer("Can I use Magigoo Original for TPU on glass?", data);
  expect(result.text).toContain("describes \\`Original\\`");
  expect(result.text).not.toContain("is designed and tested for TPU");
});

it.each([
  ["Which materials does this hotend support?", "Synthetic Hotend", /Check your filament.s printing requirements/, /What filament and printer setup/],
  ["How do I use this controller?", "Synthetic Controller", /installation or operating instructions/, /procedure needs checking/],
  ["Can I use PETG with this bracket?", "Synthetic Bracket", /requirements for PETG/, /Which device model/],
  ["When does it release the print?", "Synthetic Adhesive", /release or cooling instructions/, /before removing the print/],
])("keeps missing-capability help useful across product types: %s", async (question, title, lead, next) => {
  const data = clone(observed.cases[0].knowledge);
  data.documents[0].product_title = title;
  // A valid reviewed body with an unrelated unknown, not an invalid empty fact array.
  data.documents[0].facts = [{ field: "unrelated_colour", label: "Colour", value: null, evidence_excerpt: "" }];
  const result = await answer(question, data);
  expect(result.text).toMatch(lead);
  expect(result.text).toMatch(next);
  expect(result.text).not.toMatch(/I can.t confirm|Check the your|500|safe for PETG|[0-9].*°C/);
  expect(result.sources).toEqual([]);
});
