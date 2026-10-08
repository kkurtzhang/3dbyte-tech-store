const assert = require("node:assert/strict")
const [kind, modulePath, variant] = process.argv.slice(2)

if (kind === "source-map") {
  const { SourceMapConsumer, SourceNode } = require(modulePath)
  const originalAdd = SourceNode.prototype.add
  let steps = 0
  // Bound the vulnerable implementation before it allocates millions of lines.
  // The actual package still performs every mapping and SourceNode operation.
  SourceNode.prototype.add = function (...args) {
    if (++steps > 10000) throw new Error("Unbounded generated-line traversal")
    return originalAdd.apply(this, args)
  }
  try {
    const childMap = {
      version: 3,
      sources: ["input.js"],
      names: [],
      mappings: "AAAA",
      sourcesContent: ["a\nb\n"],
    }
    const sections = [
      // Below the fixed consumer's input cap: exercise traversal, not rejection.
      { offset: { line: 1000000, column: 0 }, map: childMap },
    ]
    if (variant === "after-valid")
      sections.unshift({ offset: { line: 0, column: 0 }, map: childMap })
    const consumer = new SourceMapConsumer({ version: 3, sections })
    const result = SourceNode.fromStringWithSourceMap("a\nb\n", consumer)
    assert.equal(result.toString(), "a\nb\n")
    assert.ok(steps < 10000)
  } finally {
    SourceNode.prototype.add = originalAdd
  }
} else if (kind === "graphql") {
  const { mergeDeep } = require(modulePath)
  const marker = "__recovery_security_marker__"
  assert.equal(Object.prototype[marker], undefined)
  assert.equal(Function.prototype[marker], undefined)
  try {
    const input =
      variant === "constructor"
        ? JSON.parse(
            '{"constructor":{"__proto__":{"__recovery_security_marker__":"polluted"}}}',
          )
        : JSON.parse(
            '{"__proto__":{"__recovery_security_marker__":"polluted"}}',
          )
    mergeDeep([{}, input])
    assert.equal(Object.prototype[marker], undefined)
    assert.equal(Function.prototype[marker], undefined)
    assert.equal(function () {}[marker], undefined)
  } finally {
    delete Object.prototype[marker]
    delete Function.prototype[marker]
  }
} else {
  throw new Error("Unknown isolated advisory fixture")
}
