"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const { test } = require("node:test");

const repo = path.resolve(__dirname, "../..");
// Strapi type-only packages and the SDK deliberately have no root JS export.
// Follow actual consumer links without importing an application entrypoint.
function consumer(workspace, names) {
  let directory = path.join(repo, workspace);
  for (const name of names) {
    const resolver = createRequire(path.join(directory, "package.json"));
    const packageFile = (resolver.resolve.paths(name) || [])
      .map((root) => path.join(root, name, "package.json"))
      .find((file) => fs.existsSync(file));
    assert.ok(packageFile, `Missing consumer dependency ${name}`);
    directory = fs.realpathSync(path.dirname(packageFile));
  }
  return directory;
}
const shell = require(consumer("", ["concurrently", "shell-quote"]));
const sharpRoot = consumer("apps/cms", [
  "@strapi/strapi",
  "@strapi/upload",
  "sharp",
]);
const sharp = require(sharpRoot);
const semver = require(
  createRequire(path.join(sharpRoot, "package.json")).resolve("semver"),
);
const sdk = consumer("apps/cms", [
  "@strapi/strapi",
  "@strapi/core",
  "@modelcontextprotocol/sdk",
]);

test("locked concurrently consumer rejects line terminators after shell comments", () => {
  for (const separator of ["\n", "\r", "\u2028", "\u2029"]) {
    assert.throws(
      () =>
        shell.quote([
          "echo",
          "fixture",
          { comment: "fixture" },
          `a${separator}b`,
        ]),
      TypeError,
    );
  }
  const args = ["node", "--", "hello world", "a'b", "$(fixture)"];
  assert.deepEqual(shell.parse(shell.quote(args)), args);
});

test("Strapi sharp consumer uses the patched native SVG library and still transforms images", async () => {
  assert.ok(semver.gte(sharp.versions.sharp, "0.35.5"));
  assert.ok(semver.gte(sharp.versions.rsvg, "2.63.2"));
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>',
  );
  const { data, info } = await sharp(svg)
    .resize(2, 2)
    .png()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 2);
  assert.equal(info.height, 2);
  assert.equal(info.format, "png");
  assert.equal((await sharp(data).metadata()).width, 2);
});

test("MCP OAuth refuses issuer-bound client credentials before preparing or sending a token request", async () => {
  const { fetchToken } = require(path.join(sdk, "dist/cjs/client/auth.js"));
  const trusted = "https://trusted.example";
  let preparations = 0;
  const calls = [];
  const provider = {
    clientMetadata: {
      redirect_uris: [],
      token_endpoint_auth_method: "client_secret_basic",
    },
    clientInformation: () => ({
      client_id: "fixture",
      client_secret: "fixture-secret",
      issuer: trusted,
    }),
    prepareTokenRequest: () => {
      preparations++;
      return new URLSearchParams({ grant_type: "client_credentials" });
    },
  };
  const fetchFn = async (url, init) => {
    calls.push({
      url: String(url),
      authorization: new Headers(init.headers).get("authorization"),
    });
    return Response.json({
      access_token: "fixture-token",
      token_type: "Bearer",
    });
  };
  await assert.rejects(
    fetchToken(provider, "https://other.example", {
      metadata: {
        issuer: "https://other.example",
        token_endpoint: "https://other.example/token",
      },
      fetchFn,
    }),
    /issuer|authorization server/i,
  );
  assert.equal(preparations, 0);
  assert.deepEqual(calls, []);
  const token = await fetchToken(provider, trusted, {
    metadata: { issuer: trusted, token_endpoint: `${trusted}/token` },
    fetchFn,
  });
  assert.equal(token.access_token, "fixture-token");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${trusted}/token`);
  assert.equal(
    calls[0].authorization,
    `Basic ${Buffer.from("fixture:fixture-secret").toString("base64")}`,
  );
});

test("Strapi's SDK server contract still serves an in-memory tool without HTTP or OAuth", async () => {
  const { McpServer } = require(path.join(sdk, "dist/cjs/server/mcp.js"));
  const { Client } = require(path.join(sdk, "dist/cjs/client/index.js"));
  const { InMemoryTransport } = require(path.join(sdk, "dist/cjs/inMemory.js"));
  const z = require(
    createRequire(path.join(sdk, "package.json")).resolve("zod"),
  );
  const server = new McpServer({ name: "fixture-server", version: "1" });
  server.registerTool(
    "reference_fixture",
    { inputSchema: { topic: z.string() } },
    async ({ topic }) => ({
      content: [{ type: "text", text: `Reference: ${topic}` }],
    }),
  );
  const client = new Client({ name: "fixture-client", version: "1" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.callTool({
      name: "reference_fixture",
      arguments: { topic: "variant unknown" },
    });
    assert.deepEqual(result.content, [
      { type: "text", text: "Reference: variant unknown" },
    ]);
  } finally {
    await client.close();
    await server.close();
  }
});

test("Next.js and its MDX integration are on the advisory patch release", () => {
  const next = JSON.parse(
    fs.readFileSync(
      path.join(consumer("apps/storefront-v3", ["next"]), "package.json"),
    ),
  );
  const mdx = JSON.parse(
    fs.readFileSync(
      path.join(consumer("apps/storefront-v3", ["@next/mdx"]), "package.json"),
    ),
  );
  assert.ok(semver.gte(next.version, "16.3.8"));
  assert.equal(mdx.version, next.version);
});
