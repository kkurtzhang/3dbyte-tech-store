"use strict";
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");
const { test } = require("node:test");
const { lockedConsumer } = require("./locked-consumer.cjs");

const consumers = [
  ["storefront", "apps/storefront-v3", ["zod"]],
  ["Medusa framework", "apps/backend", ["@medusajs/framework/zod"]],
  ["Strapi core", "apps/cms", ["@strapi/strapi", "@strapi/core", "zod"]],
  ["Strapi utils", "apps/cms", ["@strapi/strapi", "@strapi/utils", "zod"]],
];
for (const [label, workspace, chain] of consumers) {
  const z = require(lockedConsumer(workspace, chain));
  test(`${label} runs Zod v4 and rejects oversized arrays before visiting elements`, async () => {
    assert.equal(z.core?.version.major, 4);
    let visits = 0;
    const element = z.preprocess((value) => {
      visits++;
      return value;
    }, z.string());
    const schema = z.array(element).max(2);
    for (const result of [
      schema.safeParse(new Array(100).fill(123)),
      await schema.safeParseAsync(new Array(100).fill(123)),
    ]) {
      assert.equal(result.success, false);
      assert.deepEqual(
        result.error.issues.map((issue) => issue.code),
        ["too_big"],
      );
    }
    assert.equal(
      visits,
      0,
      "oversized collections must not accumulate per-element issues",
    );
    assert.deepEqual(schema.parse(["a", "b"]), ["a", "b"]);
    assert.equal(visits, 2);
    assert.equal(schema.safeParse([123]).error.issues[0].code, "invalid_type");
  });
}

test("the storefront AI SDK converts and validates actual v4 tool schemas without a provider", async () => {
  const storefront = createRequire(
    path.resolve(__dirname, "../../apps/storefront-v3/package.json"),
  );
  const z = storefront("zod");
  const { zodSchema } = storefront("ai");
  const schema = z.object({
    quantity: z.number().int().min(1).default(1),
    metadata: z.record(z.string(), z.string()).optional(),
  });
  const converted = zodSchema(schema);
  assert.equal(converted.jsonSchema.type, "object");
  assert.deepEqual((await converted.validate({})).value, { quantity: 1 });
  assert.equal((await converted.validate({ quantity: 0 })).success, false);
});

test("Strapi's actual validator formats v4 issues and preserves defaults", () => {
  const utils = require(
    lockedConsumer("apps/cms", ["@strapi/strapi", "@strapi/utils"]),
  );
  const { z } = utils;
  const schema = z.object({
    entries: z
      .array(z.object({ title: z.string().min(1, "Title required") }))
      .max(2),
    limit: z.number().default(1),
  });
  const validate = utils.validateZodSchema(schema);
  assert.deepEqual(validate({ entries: [{ title: "Fixture" }] }), {
    entries: [{ title: "Fixture" }],
    limit: 1,
  });
  assert.throws(
    () => validate({ entries: [{ title: "" }] }),
    (error) => {
      assert.equal(error.name, "ValidationError");
      assert.equal(error.message, "Title required");
      assert.deepEqual(error.details.errors[0].path, ["entries", "0", "title"]);
      return true;
    },
  );
  const invalid = schema.safeParse({ entries: [{ title: "" }] });
  assert.deepEqual(utils.getZodValidationErrors(invalid.error), {
    "entries.0.title": "Title required",
  });
});
