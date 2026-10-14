const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const http = require("node:http")
const path = require("node:path")
const { test } = require("node:test")
const zlib = require("node:zlib")

const { lockedConsumer } = require("./locked-consumer.cjs")

const express = require(
  lockedConsumer("apps/backend", ["@medusajs/framework", "express"]),
)
const proxyaddr = require(
  lockedConsumer("apps/backend", [
    "@medusajs/framework",
    "express",
    "proxy-addr",
  ]),
)
const compression = require(
  lockedConsumer("apps/backend", ["@medusajs/framework", "compression"]),
)
const sourceMapPath = lockedConsumer("apps/storefront-v3", [
  "postcss",
  "source-map-js",
])
const graphqlPath = lockedConsumer("apps/backend", [
  "@medusajs/utils",
  "@graphql-codegen/core",
  "@graphql-tools/utils",
])

const handlebars = require(lockedConsumer("apps/cms", [
  "@strapi/strapi", "@strapi/generators", "handlebars",
]))

test("Handlebars rejects AST block parameter type confusion before emitting executable code", () => {
  const ast = handlebars.parse("{{#missingHelper}}{{/missingHelper}}")
  ast.body[0].program.blockParams = { length: "(globalThis.__handlebarsInjected = true, 0)" }
  assert.throws(() => handlebars.precompile(ast))
  assert.throws(() => handlebars.compile(ast)({}))
  assert.equal(globalThis.__handlebarsInjected, undefined)
})

test("Handlebars deny list applies to an own constructor on Function.prototype", () => {
  const template = handlebars.compile('{{lookup (lookup fn "__proto__") "constructor"}}')
  assert.equal(template({ fn: function fixture() {} }, { allowProtoMethodsByDefault: true }), "")
})

test("Handlebars retains ordinary Strapi generator interpolation and iteration", () => {
  const template = handlebars.compile("Hello {{name}}:{{#each fields}} {{name}}{{/each}}")
  assert.equal(template({ name: "fixture", fields: [{name: "title"}, {name: "source"}] }), "Hello fixture: title source")
})

async function withServer(app, run) {
  const server = http.createServer(app)
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  try {
    return await run(server)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
}

function request(server, headers = {}, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: server.address().port,
        path: "/",
        headers,
        method,
      },
      (res) => {
        const chunks = []
        res.on("data", (chunk) => chunks.push(chunk))
        res.once("error", reject)
        res.once("end", () =>
          resolve({ body: Buffer.concat(chunks), headers: res.headers }),
        )
      },
    )
    req.setTimeout(2000, () =>
      req.destroy(new Error("Loopback fixture deadline exceeded")),
    )
    req.once("error", reject)
    req.end()
  })
}

for (const subnet of ["::ffff:10.0.0.0/8", "::/1"]) {
  test(`proxy-addr does not trust arbitrary IPv4 peers via ${subnet}`, () => {
    const trust = proxyaddr.compile(subnet)
    for (const peer of ["203.0.113.42", "198.51.100.8", "127.0.0.1"])
      assert.equal(trust(peer), false)
  })
  test(`actual Express ignores spoofed forwarding from peers outside ${subnet}`, async () => {
    const app = express()
    app.set("trust proxy", subnet)
    app.get("/", (req, res) => res.json({ ip: req.ip, ips: req.ips }))
    await withServer(app, async (server) => {
      const response = await request(server, {
        "X-Forwarded-For": "203.0.113.42",
      })
      assert.deepEqual(JSON.parse(response.body), { ip: "127.0.0.1", ips: [] })
    })
  })
}

test("proxy-addr preserves valid plain IPv4 and fully mapped IPv6 subnet trust", () => {
  for (const subnet of ["10.0.0.0/8", "::ffff:10.0.0.0/104"]) {
    const trust = proxyaddr.compile(subnet)
    assert.equal(trust("10.1.2.3"), true)
    assert.equal(trust("::ffff:10.1.2.3"), true)
    assert.equal(trust("203.0.113.42"), false)
  }
  assert.equal(proxyaddr.compile("2001:db8::/32")("2001:db8::42"), true)
  assert.equal(proxyaddr.compile("2001:db8::/32")("2001:db9::42"), false)
})

test("actual Express still accepts forwarding from deliberately trusted loopback", async () => {
  const app = express()
  app.set("trust proxy", "loopback")
  app.get("/", (req, res) => res.json({ ip: req.ip, ips: req.ips }))
  await withServer(app, async (server) => {
    const response = await request(server, {
      "X-Forwarded-For": "203.0.113.42",
    })
    assert.deepEqual(JSON.parse(response.body), {
      ip: "203.0.113.42",
      ips: ["203.0.113.42"],
    })
  })
})

for (const variant of ["first-large", "after-valid"]) {
  test(`source-map-js bounds indexed section traversal (${variant}) and preserves code`, () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(__dirname, "fixtures/runtime-advisory-worker.cjs"),
        "source-map",
        sourceMapPath,
        variant,
      ],
      {
        env: { PATH: "/usr/bin:/bin", TZ: "UTC" },
        timeout: 2000,
        maxBuffer: 64 * 1024,
      },
    )
    assert.equal(
      result.status,
      0,
      `Indexed traversal failed: ${result.error?.code || result.stderr?.toString()}`,
    )
  })
}

test("source-map-js preserves ordinary mapped code and original source positions", () => {
  const { SourceMapConsumer, SourceNode } = require(sourceMapPath)
  const consumer = new SourceMapConsumer({
    version: 3,
    sources: ["input.js"],
    names: [],
    mappings: "AAAA",
    sourcesContent: ["a\nb\n"],
  })
  const result = SourceNode.fromStringWithSourceMap("a\nb\n", consumer)
  assert.equal(result.toString(), "a\nb\n")
  assert.equal(
    consumer.originalPositionFor({ line: 1, column: 0 }).source,
    "input.js",
  )
})

for (const variant of ["oversized", "nested", "fractional"]) {
  test(`source-map-js rejects invalid indexed offsets before traversal (${variant})`, () => {
    const { SourceMapConsumer } = require(sourceMapPath)
    const leaf = { version: 3, sources: [], names: [], mappings: "" }
    const indexed = (line, map) => ({
      version: 3,
      sections: [{ offset: { line, column: 0 }, map }],
    })
    const input =
      variant === "nested"
        ? indexed(6000000, indexed(6000000, leaf))
        : indexed(variant === "oversized" ? 1000000000000 : 0.5, leaf)
    assert.throws(
      () => new SourceMapConsumer(input),
      variant === "fractional" ? /non-negative integers/ : /must not exceed/,
    )
  })
}

for (const variant of ["constructor", "proto"]) {
  test(`GraphQL mergeDeep does not pollute process prototypes (${variant})`, () => {
    // Any pollution remains inside a credential-free bounded child process.
    const result = spawnSync(
      process.execPath,
      [
        path.join(__dirname, "fixtures/runtime-advisory-worker.cjs"),
        "graphql",
        graphqlPath,
        variant,
      ],
      {
        env: { PATH: "/usr/bin:/bin", TZ: "UTC" },
        timeout: 2000,
        maxBuffer: 64 * 1024,
      },
    )
    assert.equal(
      result.status,
      0,
      `Prototype isolation failed: ${result.error?.code || result.stderr?.toString()}`,
    )
  })
}

test("GraphQL mergeDeep preserves ordinary nested merging and caller-owned values", () => {
  const { mergeDeep } = require(graphqlPath)
  const a = { product: { name: "Draft", keywords: ["one"] } }
  const b = { product: { kind: "hotend", keywords: ["two"] } }
  const before = JSON.stringify([a, b])
  const result = mergeDeep([a, b])
  assert.equal(result.product.name, "Draft")
  assert.equal(result.product.kind, "hotend")
  assert.deepEqual(result.product.keywords, ["one", "two"])
  assert.equal(JSON.stringify([a, b]), before)
})

for (const [encoding, factory] of [
  ["gzip", "createGzip"],
  ["deflate", "createDeflate"],
  ["br", "createBrotliCompress"],
]) {
  test(`compression releases native ${encoding} stream after aborted HTTP response`, async () => {
    const streams = []
    const descriptor = Object.getOwnPropertyDescriptor(zlib, factory)
    Object.defineProperty(zlib, factory, {
      ...descriptor,
      value: (...args) => {
        const stream = descriptor.value(...args)
        streams.push(stream)
        return stream
      },
    })
    let closeResponse
    const responseClosed = new Promise((resolve) => {
      closeResponse = resolve
    })
    const app = express()
    app.use(compression({ threshold: 0 }))
    app.get("/", (req, res) => {
      res.once("close", () => setImmediate(closeResponse))
      res.type("text/plain")
      res.write("draft evidence ".repeat(2048))
      res.flush()
    })
    try {
      await withServer(app, async (server) => {
        await new Promise((resolve, reject) => {
          const req = http.get(
            {
              host: "127.0.0.1",
              port: server.address().port,
              path: "/",
              headers: { "Accept-Encoding": encoding },
            },
            (res) => {
              res.once("error", () => {})
              res.once("data", () => {
                req.destroy()
                resolve()
              })
            },
          )
          req.once("error", reject)
          req.setTimeout(2000, () =>
            req.destroy(new Error("Abort fixture deadline exceeded")),
          )
        })
        await responseClosed
        assert.equal(
          streams.length,
          1,
          "Fixture must create the actual native compression stream",
        )
        assert.equal(
          streams[0].destroyed,
          true,
          "Aborted response retains its native compression allocation",
        )
      })
    } finally {
      for (const stream of streams) stream.destroy()
      Object.defineProperty(zlib, factory, descriptor)
    }
  })
}

test("compression preserves ordinary gzip output and no-transform behavior", async () => {
  const body = "reviewable product evidence\n".repeat(256)
  const app = express()
  app.use(compression({ threshold: 0 }))
  app.get("/", (req, res) => {
    if (req.headers["x-fixture-no-transform"])
      res.set("Cache-Control", "no-transform")
    res.type("text/plain").send(body)
  })
  await withServer(app, async (server) => {
    const response = await request(server, { "Accept-Encoding": "gzip" })
    assert.equal(response.headers["content-encoding"], "gzip")
    assert.equal(zlib.gunzipSync(response.body).toString(), body)
    const uncompressed = await request(server, {
      "Accept-Encoding": "gzip",
      "X-Fixture-No-Transform": "1",
    })
    assert.equal(uncompressed.headers["content-encoding"], undefined)
    assert.equal(uncompressed.body.toString(), body)
    const head = await request(server, { "Accept-Encoding": "gzip" }, "HEAD")
    assert.equal(head.body.length, 0)
    assert.equal(head.headers["content-encoding"], undefined)
  })
})
