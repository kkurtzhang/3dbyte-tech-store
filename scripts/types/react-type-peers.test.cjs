"use strict";
const assert = require("node:assert/strict");
const { realpathSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "../..");
const storefront = createRequire(path.join(root, "apps/storefront-v3/package.json"));
const next = createRequire(storefront.resolve("next/package.json"));

// Next-generated layouts use the ambient React namespace. Resolve its type
// peers from Next itself so a workspace-root React 18 installation cannot
// silently shadow this storefront's React 19 declarations.
for (const peer of ["@types/react", "@types/react-dom"]) {
  test(`Next resolves the storefront's ${peer} type declarations`, () => {
    assert.equal(
      realpathSync(next.resolve(`${peer}/package.json`)),
      realpathSync(storefront.resolve(`${peer}/package.json`)),
    );
  });
}

test("Next React type peers match its existing runtime major", () => {
  for (const runtime of ["react", "react-dom"]) {
    const version = next(`${runtime}/package.json`).version;
    const typeVersion = next(`@types/${runtime}/package.json`).version;
    assert.equal(typeVersion.split(".")[0], version.split(".")[0]);
    assert.equal(version, storefront(`${runtime}/package.json`).version);
  }
});
