"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createRequire } = require("node:module");
const { pathToFileURL } = require("node:url");
const { once } = require("node:events");
const { test } = require("node:test");
const { lockedConsumer } = require("./locked-consumer.cjs");
const coreEntry = lockedConsumer("apps/cms", [
  "@strapi/strapi",
  "@strapi/core",
]);
const core = createRequire(coreEntry);
const Koa = core("koa");
const sessionEntry = core.resolve("koa-session");
const sessionRequire = createRequire(sessionEntry);
const bodyEntry = core.resolve("koa-body");
const bodyRequire = createRequire(bodyEntry);
const strapiSession = require(
  path.join(path.dirname(coreEntry), "middlewares/session.js"),
).session;
const strapiBody = require(
  path.join(path.dirname(coreEntry), "middlewares/body.js"),
).body;
const loadSession = async (format) =>
  format === "cjs"
    ? core("koa-session")
    : import(
        pathToFileURL(
          path.resolve(path.dirname(sessionEntry), "../esm/index.js"),
        )
      );
const cookies = (response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");

async function serve(t, app) {
  app.on("error", () => {});
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

for (const [label, resolver] of [
  ["koa-body", bodyRequire],
  ["koa-session", sessionRequire],
]) {
  test(`${label} resolves genuine patched Zod v4 and bounds collection validation`, () => {
    const z = resolver("zod");
    assert.equal(z.core?.version.major, 4);
    assert.equal(resolver("zod/package.json").version, "4.6.6");
    let visits = 0;
    const result = z
      .array(
        z.preprocess((value) => {
          visits++;
          return value;
        }, z.string()),
      )
      .max(2)
      .safeParse(Array(100).fill(123));
    assert.equal(result.success, false);
    assert.equal(result.error.issues.length, 1);
    assert.equal(result.error.issues[0].code, "too_big");
    assert.equal(visits, 0);
  });
}

for (const format of ["cjs", "esm"]) {
  test(`${format} SessionOptions retains defaults, function validation, extra arguments and this`, async () => {
    const { SessionOptions } = await loadSession(format);
    const options = SessionOptions.parse({});
    assert.deepEqual(options.decode(options.encode({ fixture: true })), {
      fixture: true,
    });
    assert.equal(options.httpOnly, true);
    assert.equal(options.signed, true);
    assert.equal(options.rolling, false);
    assert.equal(SessionOptions.safeParse({ maxAge: Infinity }).success, false);
    assert.equal(SessionOptions.safeParse({ maxAge: "session" }).success, true);
    assert.throws(
      () => options.encode(),
      "missing any argument must still be rejected",
    );
    assert.throws(() => options.decode(123));
    for (const input of [
      { signed: "false" },
      { encode: 1 },
      { store: {} },
      { externalKey: { get: 1, set() {} } },
    ]) {
      assert.equal(SessionOptions.safeParse(input).success, false);
    }
    let receiver;
    const validated = SessionOptions.parse({
      encode(value, extra) {
        receiver = this;
        return JSON.stringify([value, extra]);
      },
      decode(value) {
        return JSON.parse(value);
      },
    });
    assert.equal(validated.encode("fixture", "extra"), '["fixture","extra"]');
    assert.equal(receiver, validated);
    assert.throws(() => SessionOptions.parse({ encode: () => 42 }).encode({}));
    assert.throws(() =>
      SessionOptions.parse({
        externalKey: { get: () => 42, set() {} },
      }).externalKey.get({}),
    );
    const callbacks = SessionOptions.parse({
      externalKey: { get: () => "key", set() {} },
      genid: () => "id",
      valid: () => true,
      beforeSave() {},
    });
    assert.equal(callbacks.genid({}), "id");
    assert.throws(() => callbacks.genid());
    assert.equal(callbacks.genid(undefined), "id");
    assert.throws(() => callbacks.valid({}));
    assert.throws(() => callbacks.beforeSave({}));
    assert.equal(callbacks.valid({}, {}), true);
    assert.equal(callbacks.beforeSave({}, {}), undefined);
    assert.throws(() => callbacks.externalKey.set({}, 123));
  });

  test(`${format} exported async store schema preserves validation and optional ctx`, async () => {
    const { SessionOptions } = await loadSession(format);
    const calls = [];
    const { store } = SessionOptions.parse({
      store: {
        async get(...args) {
          calls.push(["get", ...args]);
          return { fixture: true };
        },
        async set() {},
        async destroy() {},
      },
    });
    assert.deepEqual(await store.get("id", 1000, { rolling: false }), {
      fixture: true,
    });
    assert.equal(calls.length, 1);
    await assert.rejects(async () => store.get(123, 1000, { rolling: false }));
    assert.equal(calls.length, 1, "invalid arguments must not reach the store");
    await assert.rejects(async () =>
      SessionOptions.parse({
        store: {
          async get() {},
          async set() {
            return "invalid";
          },
          async destroy() {},
        },
      }).store.set("id", {}, 1000, { rolling: false, changed: true }),
    );
    await store.set("id", {}, 1000, { rolling: false, changed: true });
    await store.destroy("id", {});
  });

  test(`${format} exported store schema accepts sync returns and preserves this/errors`, async () => {
    const { SessionOptions } = await loadSession(format);
    let receiver;
    const rejection = new Error("fixture store rejection");
    const { store } = SessionOptions.parse({
      store: {
        get() {
          receiver = this;
          return { fixture: true };
        },
        set() {},
        destroy() {
          return Promise.reject(rejection);
        },
      },
    });
    assert.deepEqual(await store.get("id", 1000, { rolling: false }), {
      fixture: true,
    });
    assert.equal(receiver, store);
    assert.equal(
      await store.set("id", {}, 1000, { rolling: false, changed: true }),
      undefined,
    );
    await assert.rejects(
      store.destroy("id", {}),
      (error) => error === rejection,
    );
  });

  test(`${format} signed cookie sessions round-trip and reject tampering`, async (t) => {
    const app = new Koa();
    app.keys = ["fixture-cookie-signing-key"];
    const { createSession } = await loadSession(format);
    app.use(
      createSession({ secure: false, sameSite: "lax", maxAge: 60000 }, app),
    );
    app.use((ctx) => {
      ctx.session.views = (ctx.session.views || 0) + 1;
      ctx.body = { views: ctx.session.views };
    });
    const url = await serve(t, app);
    const first = await fetch(url);
    assert.deepEqual(await first.json(), { views: 1 });
    const cookie = cookies(first);
    assert.match(cookie, /koa\.sess\.sig=/);
    assert.match(first.headers.get("set-cookie"), /httponly/i);
    assert.match(first.headers.get("set-cookie"), /samesite=lax/i);
    const second = await fetch(url, { headers: { cookie } });
    assert.deepEqual(await second.json(), { views: 2 });
    const tampered = await fetch(url, {
      headers: { cookie: cookie.replace("koa.sess=", "koa.sess=forged") },
    });
    assert.deepEqual(await tampered.json(), { views: 1 });
  });
}

for (const asyncStore of [false, true]) {
  test(`actual Strapi session middleware preserves ${asyncStore ? "async" : "sync"} store and logout`, async (t) => {
    const app = new Koa();
    app.keys = ["fixture-strapi-key"];
    const data = new Map();
    const calls = [];
    const store = {
      get(key) {
        calls.push("get");
        return asyncStore ? Promise.resolve(data.get(key)) : data.get(key);
      },
      set(key, value) {
        calls.push("set");
        data.set(key, value);
        return asyncStore ? Promise.resolve() : undefined;
      },
      destroy(key) {
        calls.push("destroy");
        data.delete(key);
        return asyncStore ? Promise.resolve() : undefined;
      },
    };
    strapiSession(
      { secure: false, store, genid: () => "fixture-session" },
      { strapi: { server: { app, use: (middleware) => app.use(middleware) } } },
    );
    app.use((ctx) => {
      if (ctx.path === "/logout") {
        ctx.session = null;
        ctx.body = { loggedOut: true };
        return;
      }
      ctx.session.views = (ctx.session.views || 0) + 1;
      ctx.body = { views: ctx.session.views };
    });
    const url = await serve(t, app);
    const first = await fetch(url);
    assert.deepEqual(await first.json(), { views: 1 });
    const cookie = cookies(first);
    const second = await fetch(url, { headers: { cookie } });
    assert.deepEqual(await second.json(), { views: 2 });
    const logout = await fetch(url + "/logout", { headers: { cookie } });
    assert.deepEqual(await logout.json(), { loggedOut: true });
    assert.equal(data.size, 0);
    assert.ok(calls.includes("get"));
    assert.ok(calls.includes("set"));
    assert.ok(calls.includes("destroy"));
  });
}

async function bodyApp(t, config, responder) {
  const app = new Koa();
  app.use(async (ctx, next) => {
    ctx.payloadTooLarge = (message) => ctx.throw(413, message);
    await next();
  });
  app.use(strapiBody(config, { strapi: { plugin: () => null } }));
  app.use(
    responder ||
      ((ctx) => {
        ctx.body = {
          body: ctx.request.body,
          raw: ctx.request.body?.[Symbol.for("unparsedBody")],
        };
      }),
  );
  return serve(t, app);
}

test("actual Strapi body middleware preserves JSON/raw/form/text and excluded methods", async (t) => {
  const url = await bodyApp(t, { includeUnparsed: true });
  const json = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"value":1}',
  });
  assert.deepEqual(await json.json(), {
    body: { value: 1 },
    raw: '{"value":1}',
  });
  const form = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "tag=a&tag=b",
  });
  const parsed = await form.json();
  assert.deepEqual(parsed.body, { tag: ["a", "b"] });
  const text = await fetch(url, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "fixture",
  });
  assert.equal((await text.json()).body, "fixture");
  assert.deepEqual(await (await fetch(url)).json(), { body: {} });
});

test("actual Strapi body middleware rejects malformed and oversized payloads", async (t) => {
  const url = await bodyApp(t, { jsonLimit: 32, formLimit: 32, textLimit: 32 });
  const malformed = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  for (const [type, body] of [
    ["application/json", JSON.stringify({ value: "x".repeat(100) })],
    ["application/x-www-form-urlencoded", "value=" + "x".repeat(100)],
    ["text/plain", "x".repeat(100)],
  ]) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": type },
      body,
    });
    assert.equal(response.status, 413);
  }
});

test("actual Strapi multipart path preserves fields/files and removes temporary uploads", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "koa-v4-upload-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let uploaded;
  const url = await bodyApp(
    t,
    { formidable: { uploadDir: directory, maxFileSize: 1024 } },
    async (ctx) => {
      const file = ctx.request.files.files;
      uploaded = file.filepath;
      ctx.body = {
        title: ctx.request.body.title,
        name: file.originalFilename,
        contents: await fs.readFile(file.filepath, "utf8"),
      };
    },
  );
  const body = new FormData();
  body.set("title", "Fixture");
  body.set(
    "files",
    new Blob(["fixture file"], { type: "text/plain" }),
    "fixture.txt",
  );
  const response = await fetch(url, { method: "POST", body });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    title: "Fixture",
    name: "fixture.txt",
    contents: "fixture file",
  });
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await fs.access(uploaded);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("Strapi did not remove the temporary upload");
});

test("published CJS/ESM session and body declarations retain typed callback contracts", async (t) => {
  const ts = require("typescript");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "koa-v4-types-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const fixture = path.join(directory, "contracts.ts");
  const cjs = sessionEntry.replace(/\.js$/, "");
  const esm = path.resolve(path.dirname(sessionEntry), "../esm/index");
  const body = path.join(path.dirname(bodyEntry), "types");
  await fs.writeFile(
    fixture,
    `
import { SessionOptions as CjsOptions, createSession, type CreateSessionOptions } from ${JSON.stringify(cjs)};
import { SessionOptions as EsmOptions } from ${JSON.stringify(esm)};
import { KoaBodyMiddlewareOptionsSchema, HttpMethodEnum } from ${JSON.stringify(body)};
const cjs = CjsOptions.parse({});
const esm = EsmOptions.parse({});
const encoded: string = cjs.encode({ fixture: true }, "extra");
const encodedEsm: string = esm.encode(undefined);
cjs.decode(encoded);
// @ts-expect-error callback arity must remain required
cjs.encode();
// @ts-expect-error decoder argument must remain a string
esm.decode(123);
createSession({ encode: value => JSON.stringify(value), decode: value => JSON.parse(value) }, {});
// @ts-expect-error codec output must remain a string
const badOptions: CreateSessionOptions = { encode: () => 123 };
const store = cjs.store!;
const pending: Promise<void> = store.set("id", {}, 1000, { rolling: false, changed: true });
store.get("id", 1000, { rolling: false });
store.destroy("id", {});
// @ts-expect-error numeric maxAge must remain required
store.get("id", "1000", { rolling: false });
const bodyOptions = KoaBodyMiddlewareOptionsSchema.parse({ parsedMethods: [HttpMethodEnum.POST] });
const methods: HttpMethodEnum[] = bodyOptions.parsedMethods;
`,
  );
  const program = ts.createProgram([fixture], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: false,
    noEmit: true,
    types: ["node"],
    typeRoots: [path.resolve(__dirname, "../../node_modules/@types")],
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => directory,
      getNewLine: () => "\n",
    }),
  );
});
