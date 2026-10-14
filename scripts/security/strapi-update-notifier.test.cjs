const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const { createRequire } = require("node:module")
const path = require("node:path")
const { test } = require("node:test")

const cms = createRequire(
  path.resolve(__dirname, "../../apps/cms/package.json"),
)
const strapi = createRequire(cms.resolve("@strapi/strapi"))
const coreEntry = strapi.resolve("@strapi/core")
const core = createRequire(coreEntry)
const packageJsonEntry = core.resolve("package-json")
const packageJson = createRequire(packageJsonEntry)

test("Strapi's CommonJS startup entry loads without require(ESM) interoperability", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-experimental-require-module",
      "-e",
      'const assert = require("node:assert/strict"); const api = require(process.argv[1]); assert.equal(typeof api.createStrapi, "function");',
      coreEntry,
    ],
    { timeout: 6000, maxBuffer: 64 * 1024, env: { PATH: process.env.PATH } },
  )
  assert.equal(
    result.status,
    0,
    result.error?.code || result.stderr?.toString(),
  )
})

test("Strapi uses the official fetch-based package-json without the vulnerable cache chain", () => {
  // Read the resolved package, not an unused copy under the virtual store.
  const metadata = require(
    path.join(path.dirname(packageJsonEntry), "package.json"),
  )
  assert.equal(metadata.version, "10.0.1")
  assert.equal(metadata.type, "module")
  assert.equal(metadata.dependencies.got, undefined)
  assert.ok(metadata.dependencies.ky)
  for (const name of ["got", "cacheable-request", "http-cache-semantics"]) {
    assert.throws(() => packageJson.resolve(name), { code: "MODULE_NOT_FOUND" })
  }
})

const fixture = String.raw`
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createRequire } = require("node:module");
const { pathToFileURL } = require("node:url");
const { setTimeout: delay } = require("node:timers/promises");
const [coreEntry, format, scenario] = process.argv.slice(1);
const core = createRequire(coreEntry);
const pkg = createRequire(core.resolve("package-json"));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "strapi-notifier-test-"));
const cacheFile = path.join(root, ".strapi-updater.json");
let calls = 0;
let networkAttempts = 0;
let warnings = 0;
const fixtureErrors = [];
// Block real I/O even if an obsolete client bypasses the fetch fixture.
const deny = () => { networkAttempts++; throw new Error("External network denied"); };
for (const name of ["node:http", "node:https"]) {
  const module = require(name); module.request = deny; module.get = deny;
}
require("node:net").connect = deny;
require("node:net").createConnection = deny;
// Stub each client's rc boundary before it can read ambient npm credentials.
for (const name of ["registry-auth-token", "registry-url"]) {
  const client = createRequire(pkg.resolve(name));
  const rcFile = client.resolve("rc");
  require.cache[rcFile] = {
    id: rcFile, filename: rcFile, loaded: true,
    exports: () => ({ registry: "https://registry.example/" }),
  };
}
const now = Date.now();
const original = { latest: "5.48.1", lastUpdateCheck: now };
if (scenario === "cached") fs.writeFileSync(cacheFile, JSON.stringify(original));
let release;
const responseReady = new Promise(resolve => { release = resolve; });
globalThis.fetch = async (input, options) => {
  calls++;
  const request = input instanceof Request ? input : new Request(input, options);
  try {
    assert.equal(request.url, "https://registry.example/@strapi%2Fcore");
    assert.equal(request.headers.has("authorization"), false);
  } catch (error) {
    fixtureErrors.push(error.message);
    throw error;
  }
  await responseReady;
  const metadata = {
    "dist-tags": { latest: "100.0.0" },
    versions: { "100.0.0": scenario === "invalid" ? { name: "@strapi/core" } : { version: "100.0.0" } },
  };
  return new Response(JSON.stringify(metadata), {
    status: scenario === "offline" ? 404 : 200,
    headers: { "content-type": "application/json" },
  });
};
(async () => {
  try {
    const notifierPath = path.join(path.dirname(coreEntry), "utils/update-notifier/index." + format);
    const notifier = format === "js" ? require(notifierPath) : await import(pathToFileURL(notifierPath));
    const appRoot = scenario === "unwritable" ? path.join(root, "not-a-directory") : root;
    if (scenario === "unwritable") fs.writeFileSync(appRoot, "fixture");
    const returned = notifier.createUpdateNotifier({
      dirs: { app: { root: appRoot } },
      config: { get: key => { assert.equal(key, "server.logger.updates.enabled"); return scenario !== "disabled"; } },
      log: { warn: () => { warnings++; } },
    });
    assert.equal(returned, undefined, "update checks must not block startup");
    if (["fresh", "offline", "invalid"].includes(scenario)) {
      for (let i = 0; i < 120 && calls === 0; i++) await delay(25);
      assert.equal(calls, 1, "expected exactly one fetch request");
      assert.deepEqual(fixtureErrors, [], "validate the intercepted request before checking the cache");
      release();
      if (scenario === "fresh") {
        let saved;
        for (let i = 0; i < 120; i++) {
          if (fs.existsSync(cacheFile)) saved = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
          if (saved?.latest === "100.0.0") break;
          await delay(25);
        }
        assert.equal(saved?.latest, "100.0.0");
        assert.ok(saved.lastUpdateCheck >= now);
      } else {
        await delay(200);
        const saved = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : {};
        assert.equal(saved.latest, undefined);
        assert.equal(saved.lastUpdateCheck, undefined);
      }
    } else {
      release();
      await delay(200);
      assert.equal(calls, 0);
      if (scenario === "cached") assert.deepEqual(JSON.parse(fs.readFileSync(cacheFile, "utf8")), original);
    }
    assert.equal(networkAttempts, 0);
    assert.equal(warnings, 0);
    assert.deepEqual(fixtureErrors, [], "offline handling must not hide fixture failures");
  } finally { release(); fs.rmSync(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
`

for (const format of ["js", "mjs"]) {
  for (const scenario of [
    "fresh",
    "cached",
    "disabled",
    "offline",
    "invalid",
    "unwritable",
  ]) {
    test(`actual Strapi ${format} notifier retains ${scenario} behavior with no external network`, () => {
      const result = spawnSync(
        process.execPath,
        [
          ...(format === "js" ? ["--no-experimental-require-module"] : []),
          "-e",
          fixture,
          coreEntry,
          format,
          scenario,
        ],
        {
          timeout: 6000,
          maxBuffer: 64 * 1024,
          env: {
            PATH: process.env.PATH,
            STRAPI_DISABLE_UPDATE_NOTIFICATION: "false",
          },
        },
      )
      assert.equal(
        result.status,
        0,
        result.error?.code || result.stderr?.toString(),
      )
    })
  }
}
