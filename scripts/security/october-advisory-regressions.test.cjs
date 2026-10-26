"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const { createRequire } = require("node:module");
const path = require("node:path");
const { test } = require("node:test");

// Resolve installed packages through the actual workspace consumer, including
// Strapi packages with no root JavaScript export. Never select a store glob.
function consumer(workspace, names) {
  let directory = path.resolve(__dirname, "../..", workspace);
  for (const name of names) {
    const resolver = createRequire(path.join(directory, "package.json"));
    const manifest = (resolver.resolve.paths(name) || [])
      .map((root) => path.join(root, name, "package.json"))
      .find((file) => fs.existsSync(file));
    assert.ok(manifest, `Missing consumer dependency ${name}`);
    directory = fs.realpathSync(path.dirname(manifest));
  }
  return directory;
}
const createDOMPurify = require(
  consumer("apps/cms", ["@strapi/content-manager", "dompurify"]),
);
const { JSDOM } = require(
  consumer("apps/storefront-v3", ["jest-environment-jsdom", "jsdom"]),
);
const { mergeIncrementalResult } = require(
  consumer("apps/backend", [
    "@medusajs/utils",
    "@graphql-codegen/core",
    "@graphql-tools/utils",
  ]),
);
const follow = require(
  consumer("apps/backend", [
    "@medusajs/test-utils",
    "axios",
    "follow-redirects",
  ]),
);

for (const [prefix, suffix] of [
  ["$", "{fixture}"],
  ["{", "{fixture}}"],
  ["<", "%fixture%>"],
]) {
  test(`Strapi DOMPurify scrubs split ${prefix} expressions inside attached shadow roots`, () => {
    const { window } = new JSDOM("");
    try {
      const host = window.document.createElement("div");
      const shadow = host.attachShadow({ mode: "open" });
      shadow.append(
        window.document.createTextNode(prefix),
        window.document.createElement("object"),
        window.document.createTextNode(suffix),
      );
      createDOMPurify(window).sanitize(host, {
        IN_PLACE: true,
        SAFE_FOR_TEMPLATES: true,
      });
      assert.equal(shadow.textContent.includes(prefix + suffix), false);
      assert.equal(shadow.querySelector("object"), null);
    } finally {
      window.close();
    }
  });
}

for (const mode of ["parent", "sibling"]) {
  test(`Strapi DOMPurify neutralizes a ${mode} detached by a hook`, () => {
    const { window } = new JSDOM("");
    try {
      const root = window.document.createElement("div");
      root.innerHTML =
        '<figure><img class="drop"><img id="fixture" onerror="fixture()"></figure><p>keep</p>';
      const detached = root.querySelector("#fixture");
      const purify = createDOMPurify(window);
      purify.addHook("afterSanitizeAttributes", (node) => {
        if (node.getAttribute?.("class") === "drop") {
          if (mode === "parent") node.parentNode.remove();
          else node.nextElementSibling.remove();
        }
      });
      purify.sanitize(root, { IN_PLACE: true });
      assert.equal(detached.getAttribute("onerror"), null);
      assert.equal(root.querySelector("p").textContent, "keep");
    } finally {
      window.close();
    }
  });
}

test("Strapi DOMPurify preserves ordinary formatted editorial content", () => {
  const { window } = new JSDOM("");
  try {
    assert.equal(
      createDOMPurify(window).sanitize(
        '<p><strong>Hotend</strong> <a href="https://example.invalid/help">Help</a><script>fixture()</script></p>',
      ),
      '<p><strong>Hotend</strong> <a href="https://example.invalid/help">Help</a></p>',
    );
  } finally {
    window.close();
  }
});

for (const segment of [["__proto__"], { toString: () => "__proto__" }]) {
  test(`GraphQL incremental results reject ${Array.isArray(segment) ? "array" : "object"} path coercion`, () => {
    try {
      try {
        mergeIncrementalResult({
          executionResult: { data: {} },
          incrementalResult: {
            path: [segment, "__octoberFixture"],
            data: "unexpected",
          },
        });
      } catch (error) {
        assert.ok(error instanceof TypeError || error instanceof Error);
      }
      assert.equal(Object.prototype.__octoberFixture, undefined);
    } finally {
      delete Object.prototype.__octoberFixture;
    }
  });
}

test("GraphQL incremental results preserve ordinary deferred data", () => {
  const result = { data: { product: { id: "fixture" } } };
  mergeIncrementalResult({
    executionResult: result,
    incrementalResult: { path: ["product"], data: { title: "Hotend" } },
  });
  assert.deepEqual(result.data.product, { id: "fixture", title: "Hotend" });
});

async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
for (const arrayHeaders of [false, true]) {
  test(`Medusa HTTP consumer strips credentials across redirects with ${arrayHeaders ? "array" : "object"} headers`, async () => {
    const received = [];
    const destination = await listen((req, res) => {
      received.push(req.headers);
      res.end("fixture");
    });
    const origin = await listen((_req, res) => {
      res.writeHead(302, {
        location: `http://127.0.0.1:${destination.address().port}/`,
      });
      res.end();
    });
    const headers = {
      Authorization: "synthetic",
      Cookie: "fixture=1",
      "Proxy-Authorization": "synthetic",
      "X-Api^Key": "synthetic",
      "X-Token|Secret": "synthetic",
      "X-Ordinary": "keep",
    };
    try {
      await new Promise((resolve, reject) => {
        let req;
        try {
          req = follow.http.request(
            {
              hostname: "127.0.0.1",
              port: origin.address().port,
              path: "/",
              headers: arrayHeaders ? Object.entries(headers).flat() : headers,
              sensitiveHeaders: ["X-Api^Key", "X-Token|Secret"],
            },
            (res) => {
              res.resume();
              res.once("end", resolve);
              res.once("error", reject);
            },
          );
        } catch (error) {
          // Explicitly rejecting unsupported header containers is also safe.
          if (arrayHeaders && error instanceof TypeError) return resolve();
          return reject(error);
        }
        req.setTimeout(2000, () =>
          req.destroy(new Error("Loopback fixture deadline")),
        );
        req.once("error", reject);
        req.end();
      });
      if (!arrayHeaders) assert.equal(received.length, 1);
      for (const request of received) {
        for (const name of [
          "authorization",
          "cookie",
          "proxy-authorization",
          "x-api^key",
          "x-token|secret",
        ])
          assert.equal(request[name], undefined, name);
        assert.equal(request["x-ordinary"], "keep");
      }
    } finally {
      await close(origin);
      await close(destination);
    }
  });
}
