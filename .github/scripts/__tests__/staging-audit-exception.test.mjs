import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { runAudit, EXPIRES_AT, ADVISORY } from "../staging-audit-exception.mjs";

const helper = resolve(".github/scripts/staging-audit-exception.mjs");
const initial =
  JSON.stringify(
    {
      name: "fixture",
      pnpm: {
        auditConfig: {
          ignoreGhsas: ["GHSA-848j-6mx2-7j84", "GHSA-866g-f22w-33x8"],
          ignoreCves: ["CVE-2020-0000"],
        },
        overrides: { example: "1.2.3" },
      },
    },
    null,
    4,
  ) + "\n";
function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), "staging-audit-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(join(cwd, "package.json"), initial);
  return {
    cwd,
    env: {
      GITHUB_ACTIONS: "true",
      GITHUB_REPOSITORY: "kkurtzhang/3dbyte-tech-store",
      GITHUB_WORKSPACE: cwd,
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_BASE_REF: "staging",
      GITHUB_REF: "refs/pull/237/merge",
    },
    now: Date.parse("2026-10-14T12:00:00Z"),
  };
}
function manifest(cwd) {
  return JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
}
for (const event of ["pull_request", "push"]) {
  test(`only approved GHSA is added for staging ${event}, then exact bytes restored`, async (t) => {
    const options = fixture(t);
    if (event === "push")
      options.env = {
        ...options.env,
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF: "refs/heads/staging",
        GITHUB_BASE_REF: "",
      };
    const expected = JSON.parse(initial);
    expected.pnpm.auditConfig.ignoreGhsas.push(ADVISORY);
    let calls = 0;
    const status = await runAudit({
      ...options,
      audit: async () => {
        calls++;
        assert.deepEqual(manifest(options.cwd), expected);
        return 0;
      },
    });
    assert.equal(status, 0);
    assert.equal(calls, 1);
    assert.equal(
      readFileSync(join(options.cwd, "package.json"), "utf8"),
      initial,
    );
  });
}
const excluded = [
  ["local", { GITHUB_ACTIONS: "" }],
  ["false CI flag", { GITHUB_ACTIONS: "false" }],
  ["another repository", { GITHUB_REPOSITORY: "other/project" }],
  ["production PR", { GITHUB_BASE_REF: "main" }],
  ["PR head ref", { GITHUB_REF: "refs/pull/237/head" }],
  ["missing PR ref", { GITHUB_REF: "" }],
  [
    "production push",
    { GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/main" },
  ],
  [
    "feature push",
    { GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/release/staging" },
  ],
  [
    "staging tag",
    { GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/tags/staging" },
  ],
  [
    "manual run",
    {
      GITHUB_EVENT_NAME: "workflow_dispatch",
      GITHUB_REF: "refs/heads/staging",
    },
  ],
  ["privileged PR event", { GITHUB_EVENT_NAME: "pull_request_target" }],
  ["workspace missing", { GITHUB_WORKSPACE: "" }],
  ["workspace mismatch", { GITHUB_WORKSPACE: "/" }],
];
for (const [label, changes] of excluded) {
  test(`${label} runs ordinary audit without changing config`, async (t) => {
    const options = fixture(t);
    let calls = 0;
    const status = await runAudit({
      ...options,
      env: { ...options.env, ...changes },
      audit: async () => {
        calls++;
        assert.equal(
          readFileSync(join(options.cwd, "package.json"), "utf8"),
          initial,
        );
        return 1;
      },
    });
    assert.equal(status, 1);
    assert.equal(calls, 1);
  });
}
for (const now of [Date.parse(EXPIRES_AT), Date.parse(EXPIRES_AT) + 1]) {
  test(`expiry ${now} restores ordinary blocking audit`, async (t) => {
    const options = fixture(t);
    assert.equal(
      await runAudit({
        ...options,
        now,
        audit: async () => {
          assert.equal(
            readFileSync(join(options.cwd, "package.json"), "utf8"),
            initial,
          );
          return 1;
        },
      }),
      1,
    );
  });
}
test("last millisecond before expiry permits only the approved advisory", async (t) => {
  const options = fixture(t);
  await runAudit({
    ...options,
    now: Date.parse(EXPIRES_AT) - 1,
    audit: async () => {
      assert.equal(
        manifest(options.cwd).pnpm.auditConfig.ignoreGhsas.at(-1),
        ADVISORY,
      );
      return 0;
    },
  });
});
for (const status of [1, 2, 17, 130, 143]) {
  test(`audit failure ${status} stays blocking and restores bytes`, async (t) => {
    const options = fixture(t);
    assert.equal(
      await runAudit({ ...options, audit: async () => status }),
      status,
    );
    assert.equal(
      readFileSync(join(options.cwd, "package.json"), "utf8"),
      initial,
    );
  });
}
test("registry/process error restores bytes and propagates", async (t) => {
  const options = fixture(t);
  await assert.rejects(
    runAudit({
      ...options,
      audit: async () => {
        throw new Error("registry unavailable");
      },
    }),
    /registry unavailable/,
  );
  assert.equal(
    readFileSync(join(options.cwd, "package.json"), "utf8"),
    initial,
  );
});
for (const invalid of [
  "{",
  '{"pnpm":{"auditConfig":{"ignoreGhsas":"all"}}}',
  '{"pnpm":{"auditConfig":null}}',
  '{"pnpm":{"auditConfig":{"ignoreGhsas":[4]}}}',
]) {
  test(`invalid manifest fails closed: ${invalid}`, async (t) => {
    const options = fixture(t);
    writeFileSync(join(options.cwd, "package.json"), invalid);
    let calls = 0;
    await assert.rejects(
      runAudit({
        ...options,
        audit: async () => {
          calls++;
          return 0;
        },
      }),
    );
    assert.equal(calls, 0);
    assert.equal(
      readFileSync(join(options.cwd, "package.json"), "utf8"),
      invalid,
    );
  });
}
test("invalid clock cannot extend exception", async (t) => {
  const options = fixture(t);
  await assert.rejects(
    runAudit({ ...options, now: NaN, audit: async () => 0 }),
    /clock/,
  );
});
test("missing optional pnpm config is restored exactly", async (t) => {
  const options = fixture(t);
  const raw = '{"name":"minimal"}\n';
  writeFileSync(join(options.cwd, "package.json"), raw);
  await runAudit({
    ...options,
    audit: async () => {
      assert.deepEqual(manifest(options.cwd).pnpm.auditConfig.ignoreGhsas, [
        ADVISORY,
      ]);
      return 0;
    },
  });
  assert.equal(readFileSync(join(options.cwd, "package.json"), "utf8"), raw);
});
test("restoration failure is fatal even after passing audit", async (t) => {
  const options = fixture(t);
  await assert.rejects(
    runAudit({
      ...options,
      audit: async () => {
        rmSync(join(options.cwd, "package.json"));
        mkdirSync(join(options.cwd, "package.json"));
        return 0;
      },
    }),
    /EISDIR/,
  );
});
async function runCli(t, { signal, missing = false, wrongArgs = false } = {}) {
  const options = fixture(t);
  const bin = join(options.cwd, "bin");
  mkdirSync(bin);
  if (!missing)
    writeFileSync(
      join(bin, "pnpm"),
      `#!${process.execPath}
const fs = require("node:fs");
fs.writeFileSync("called.json", JSON.stringify({ args: process.argv.slice(2), manifest: JSON.parse(fs.readFileSync("package.json", "utf8")) }));
${signal ? "setInterval(() => {}, 1000);" : "process.exit(19);"}
`,
      { mode: 0o755 },
    );
  const child = spawn(
    process.execPath,
    [
      helper,
      "--",
      "pnpm",
      "audit",
      wrongArgs ? "--ignore-unfixable" : "--audit-level=high",
    ],
    {
      cwd: options.cwd,
      env: { ...options.env, PATH: bin },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const completed = once(child, "close");
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
  });
  if (signal) {
    const deadline = Date.now() + 5000;
    while (!existsSync(join(options.cwd, "called.json"))) {
      if (Date.now() >= deadline) {
        child.kill("SIGKILL");
        assert.fail("audit child did not start");
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    child.kill(signal);
  }
  const [code] = await completed;
  assert.equal(
    readFileSync(join(options.cwd, "package.json"), "utf8"),
    initial,
  );
  return { code, stderr, cwd: options.cwd };
}
test("CLI preserves exact audit arguments and failure exit", async (t) => {
  const { code, cwd } = await runCli(t);
  assert.equal(code, 19);
  assert.deepEqual(
    JSON.parse(readFileSync(join(cwd, "called.json"), "utf8")).args,
    ["audit", "--audit-level=high"],
  );
});
test("CLI missing pnpm restores manifest and fails", async (t) => {
  assert.equal((await runCli(t, { missing: true })).code, 1);
});
test("CLI refuses alternative audit commands", async (t) => {
  const { code, cwd } = await runCli(t, { wrongArgs: true });
  assert.equal(code, 1);
  assert.equal(existsSync(join(cwd, "called.json")), false);
});
for (const [signal, expected] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
]) {
  test(`CLI restores on ${signal}`, async (t) => {
    assert.equal((await runCli(t, { signal })).code, expected);
  });
}

test("a permanent braces ignore is rejected rather than concealed", async (t) => {
  const options = fixture(t);
  const value = JSON.parse(initial);
  value.pnpm.auditConfig.ignoreGhsas.push(ADVISORY);
  const raw = JSON.stringify(value);
  writeFileSync(join(options.cwd, "package.json"), raw);
  await assert.rejects(
    runAudit({ ...options, audit: async () => 0 }),
    /permanently ignored/,
  );
  assert.equal(readFileSync(join(options.cwd, "package.json"), "utf8"), raw);
});
test("symlinked manifests are rejected without changing their target", async (t) => {
  const options = fixture(t);
  const target = join(options.cwd, "original.json");
  writeFileSync(target, initial);
  rmSync(join(options.cwd, "package.json"));
  symlinkSync(target, join(options.cwd, "package.json"));
  await assert.rejects(
    runAudit({ ...options, audit: async () => 0 }),
    /regular file/,
  );
  assert.equal(readFileSync(target, "utf8"), initial);
});
test("CI keeps the audit, secret scan, cleanup assertion and exception regressions", () => {
  const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
  assert.match(
    workflow,
    /run: node \.github\/scripts\/staging-audit-exception\.mjs -- pnpm audit --audit-level=high/,
  );
  assert.match(
    workflow,
    /gitleaks dir \. --config \.gitleaks\.toml --redact --exit-code 1/,
  );
  assert.match(
    workflow,
    /if: always\(\)\n\s+run: git diff --exit-code -- package\.json pnpm-lock\.yaml pnpm-workspace\.yaml/,
  );
  assert.match(
    workflow,
    /node --test \.github\/scripts\/__tests__\/staging-audit-exception\.test\.mjs/,
  );
  assert.doesNotMatch(
    workflow,
    /continue-on-error:\s*true|--ignore-unfixable|--ignore-registry-errors/,
  );
  assert.deepEqual(
    JSON.parse(readFileSync("package.json", "utf8")).pnpm.auditConfig
      .ignoreGhsas,
    ["GHSA-848j-6mx2-7j84", "GHSA-866g-f22w-33x8"],
  );
  assert.doesNotMatch(
    readFileSync("pnpm-workspace.yaml", "utf8"),
    /^auditConfig:/m,
  );
});
