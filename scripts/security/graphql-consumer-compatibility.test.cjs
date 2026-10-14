const assert = require("node:assert/strict")
const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const { test } = require("node:test")

const { lockedConsumer } = require("./locked-consumer.cjs")

const medusa = require(
  path.join(
    path.dirname(lockedConsumer("apps/backend", ["@medusajs/utils"])),
    "graphql/index.js",
  ),
)
const typeDefs = medusa.mergeTypeDefs([
  `scalar DateTime
   scalar JSON
   enum DraftKind { FILAMENT HOTEND }
   type Draft { id: ID!, kind: DraftKind!, evidence: JSON, updated_at: DateTime }
   type Query { draft: Draft! }`,
  `extend type Draft { title: String! }`,
])
const schema = medusa.makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      draft: () => ({ id: "fixture", kind: "HOTEND", title: "Review fixture" }),
    },
  },
})

test("actual Medusa schema merge and execution preserve extended fields and enum values", async () => {
  const result = await medusa.graphql({
    schema,
    source: "{ draft { id kind title } }",
  })
  assert.equal(result.errors, undefined)
  assert.deepEqual(JSON.parse(JSON.stringify(result.data)), {
    draft: { id: "fixture", kind: "HOTEND", title: "Review fixture" },
  })
})

test("actual Medusa codegen preserves scalar contracts and remote-query entrypoints", async (t) => {
  const outputDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "draft-graphql-compat-"),
  )
  t.after(() => fs.rm(outputDir, { recursive: true, force: true }))
  await medusa.gqlSchemaToTypes({
    schema,
    outputDir,
    filename: "draft-fixture",
    joinerConfigs: [{ alias: { name: ["draft", "drafts"], entity: "Draft" } }],
    interfaceName: "RemoteQueryEntryPoints",
  })
  const output = await fs.readFile(
    path.join(outputDir, "draft-fixture.d.ts"),
    "utf8",
  )
  assert.match(output, /export type Draft =/)
  assert.match(output, /'FILAMENT'\s*\|\s*'HOTEND'/)
  assert.match(output, /Date \| string/)
  assert.match(output, /Record<string, unknown>/)
  assert.match(output, /draft: Draft/)
  assert.match(output, /drafts: Draft/)
  assert.match(
    await fs.readFile(path.join(outputDir, "index.d.ts"), "utf8"),
    /RemoteQueryEntryPointsTypes.*draft-fixture/,
  )
})
