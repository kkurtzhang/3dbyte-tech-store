const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const { createRequire } = require("node:module")
const path = require("node:path")
const { test } = require("node:test")

const repo = path.resolve(__dirname, "../..")
function dependency(workspace, chain) {
  let resolve = createRequire(path.join(repo, workspace, "package.json"))
  let file
  for (const name of chain) {
    file = resolve.resolve(name)
    resolve = createRequire(file)
  }
  return file
}
// Follow the actual locked consumers, not stale/unreferenced .pnpm directories.
const figletPath = dependency("apps/backend", [
  "@medusajs/framework",
  "@jercle/yargonaut",
  "figlet",
])
const bracesPath = dependency("", [
  "@changesets/cli",
  "@changesets/config",
  "micromatch",
  "braces",
])
const braces = require(bracesPath)

test("figlet wrapping makes progress even when a character is wider than width", () => {
  // The old version hangs: isolate it with a bounded timeout and output buffer.
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      `
    const figlet = require(process.argv[1]);
    const value = figlet.textSync("a b", { font: "Standard", width: 1, whitespaceBreak: true });
    if (typeof value !== "string" || !value.trim()) process.exit(2);
  `,
      figletPath,
    ],
    { timeout: 2000, maxBuffer: 64 * 1024 },
  )
  assert.equal(
    result.status,
    0,
    `Wrapping failed: ${result.error?.code || result.stderr?.toString()}`,
  )
})

const nested = (depth, open = "{", close = "}") =>
  open.repeat(depth) + "x" + close.repeat(depth)
const depthError = (error) =>
  error instanceof RangeError &&
  /Nesting depth/.test(error.message) &&
  !/call stack/.test(error.message)
for (const operation of ["parse", "compile", "expand", "stringify"]) {
  test(`braces ${operation} rejects deeply nested strings before recursive walking`, () => {
    assert.throws(() => braces[operation](nested(4000)), depthError)
  })
  test(`braces ${operation} honors stricter limits without permitting a higher unsafe limit`, () => {
    assert.throws(
      () => braces[operation](nested(6), { maxDepth: 5 }),
      depthError,
    )
    assert.throws(
      () => braces[operation](nested(101), { maxDepth: 99999 }),
      depthError,
    )
  })
  test(`braces ${operation} does not raise a sub-one depth limit to one`, () => {
    for (const maxDepth of [0, 0.5]) {
      for (const [open, close] of [
        ["{", "}"],
        ["(", ")"],
      ]) {
        assert.throws(
          () => braces[operation](nested(1, open, close), { maxDepth }),
          depthError,
        )
      }
      assert.doesNotThrow(() => braces[operation]("plain-text", { maxDepth }))
    }
  })
  test(`braces ${operation} consistently enforces a fractional limit`, () => {
    for (const [open, close] of [
      ["{", "}"],
      ["(", ")"],
    ]) {
      assert.doesNotThrow(() =>
        braces[operation](nested(1, open, close), { maxDepth: 1.5 }),
      )
      assert.throws(
        () => braces[operation](nested(2, open, close), { maxDepth: 1.5 }),
        depthError,
      )
    }
  })
}
test("braces rejects nested parentheses as well as mixed containers", () => {
  assert.throws(() => braces.parse(nested(101, "(", ")")), depthError)
  assert.throws(() => braces.parse(nested(51, "({", "})")), depthError)
})
for (const operation of ["compile", "expand", "stringify"]) {
  test(`braces ${operation} guards caller-supplied ASTs, including cycles`, () => {
    let tree = { type: "text", value: "x" }
    for (let i = 0; i < 102; i++) tree = { type: "root", nodes: [tree] }
    assert.throws(() => braces[operation](tree), depthError)
    const cyclic = { type: "root", nodes: [] }
    cyclic.nodes.push(cyclic)
    assert.throws(() => braces[operation](cyclic), depthError)
  })
}
test("normal braces patterns and the 100-level boundary retain their behavior", () => {
  assert.deepEqual(braces.expand("src/{api,lib}/*.{ts,tsx}"), [
    "src/api/*.ts",
    "src/api/*.tsx",
    "src/lib/*.ts",
    "src/lib/*.tsx",
  ])
  assert.equal(braces.compile("{a,b}"), "(a|b)")
  assert.equal(braces.stringify(braces.parse(nested(100))), nested(100))
  assert.doesNotThrow(() => braces.compile(nested(100)))
  assert.doesNotThrow(() => braces.expand(nested(100)))
})

for (const parents of ["self", "multiple"]) {
  test(`braces expand rejects ${parents}-node parent cycles without hanging`, () => {
    // A guard regression must not hang the security runner itself. Resolve the
    // same installed consumer and fail if bounded child execution times out.
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        `
      const braces = require(process.argv[1]);
      const ast = { type: 'paren', nodes: [{ type: 'text', value: 'x' }] };
      ast.parent = process.argv[2] === 'self'
        ? ast
        : { type: 'paren', nodes: [], parent: ast };
      try { braces.expand(ast); process.exit(2); }
      catch (error) {
        if (!(error instanceof RangeError) || !/parent chain.*cycle/i.test(error.message)) {
          console.error(error.message); process.exit(3);
        }
      }
    `,
        bracesPath,
        parents,
      ],
      { timeout: 2000, maxBuffer: 64 * 1024 },
    )
    assert.equal(
      result.status,
      0,
      `Cycle check failed: ${result.error?.code || result.stderr?.toString()}`,
    )
  })
}

test("braces preserves acyclic parent traversal and stringify escapeInvalid compatibility", () => {
  for (const value of ["(a)", "(a{b,c})", "((a){b,c})"]) {
    assert.deepEqual(braces.expand(braces.parse(value)), braces.expand(value))
  }
  for (const value of [
    "{{a}}",
    "{a,{b}}",
    "{{x}y}",
    "{a,{b,{c}}",
    "{}{a}",
    "{1..8}",
  ]) {
    assert.equal(
      braces.stringify(braces.parse(value), { escapeInvalid: true }),
      value,
    )
  }
})
