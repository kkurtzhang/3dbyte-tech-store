"use strict";
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");
const { test } = require("node:test");
const { lockedConsumer } = require("./locked-consumer.cjs");

const chain = ["@opentelemetry/auto-instrumentations-node", "@opentelemetry/instrumentation-host-metrics"];
const hostEntry = lockedConsumer("packages/observability", chain);
const entry = lockedConsumer("packages/observability", [...chain, "systeminformation"]);
const manifest = require(path.resolve(path.dirname(entry), "../package.json"));
const util = require(path.join(path.dirname(entry), "util.js"));

test("the actual production host-metrics consumer resolves the patched systeminformation floor", () => {
  const [major, minor, patch] = manifest.version.split(".").map(Number);
  assert.ok(major > 5 || (major === 5 && (minor > 33 || (minor === 33 && patch >= 16))), manifest.version);
});
for (const strict of [false, true]) {
  test(`Unicode service-name quotes cannot survive sanitization (strict=${strict})`, () => {
    // Pure string handling only: no services(), PowerShell, commands or network.
    const result = util.sanitizeShellString("service\u201Cquoted\u201Dname", strict);
    assert.doesNotMatch(result, /[\u201C\u201D]/u);
    assert.equal(util.sanitizeShellString("safe_service01", strict), "safe_service01");
  });
}
test("host-metrics retains its systeminformation/lib/network public module shape", () => {
  const network = createRequire(hostEntry)("systeminformation/lib/network");
  assert.equal(typeof network.networkStats, "function");
});
