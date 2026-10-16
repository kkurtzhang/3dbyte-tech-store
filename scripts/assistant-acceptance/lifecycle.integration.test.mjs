import assert from "node:assert/strict";
import { test } from "node:test";
import net from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdtemp,
  writeFile,
  chmod,
  rm,
  readFile,
  symlink,
} from "node:fs/promises";
import path from "node:path";
import { parseOptions, readProviderKey } from "./config.mjs";
import { runHarness } from "./runner.mjs";
import {
  freePort,
  makeRunDirectory,
  preflight,
  startRedis,
  waitUntil,
  redisPing,
} from "./lifecycle.mjs";
const options = parseOptions(["run"]);
async function assertClosed(report) {
  assert.deepEqual(report.cleanup, { next: true, fixtures: true, redis: true });
  for (const item of Object.values(report.listeners ?? {})) {
    assert.equal(
      await new Promise((resolve) => {
        const s = net.connect({ host: item.host, port: item.port });
        s.once("connect", () => {
          s.destroy();
          resolve(false);
        });
        s.once("error", () => resolve(true));
        s.setTimeout(1000, () => {
          s.destroy();
          resolve(false);
        });
      }),
      true,
    );
  }
}
async function command(port, parts) {
  const request =
    "*" +
    parts.length +
    "\r\n" +
    parts.map((p) => "$" + Buffer.byteLength(p) + "\r\n" + p + "\r\n").join("");
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.on("connect", () => socket.write(request));
    socket.once("data", (data) => {
      socket.destroy();
      resolve(data.toString());
    });
    socket.on("error", reject);
    socket.setTimeout(2000, () => {
      socket.destroy();
      reject(new Error("Timeout"));
    });
  });
}
test("missing live config and unknown cases stop before starting services", async () => {
  await assert.rejects(
    runHarness({ ...options, mode: "live" }),
    /needs --key-file/,
  );
  await assert.rejects(
    runHarness({ ...options, caseId: "not-a-case" }),
    /Unknown acceptance case/,
  );
});
test("private config rejects permissive permissions, extra fields and checkout paths", async () => {
  const dir = await mkdtemp(
    path.join(options.workspace, "private-config-test-"),
  );
  const file = path.join(dir, "provider.env");
  try {
    await writeFile(file, "DEEPSEEK_API_KEY=fixture-only-provider-marker\n", {
      mode: 0o644,
    });
    await assert.rejects(readProviderKey(file), /owner-only/);
    await chmod(file, 0o600);
    assert.equal(await readProviderKey(file), "fixture-only-provider-marker");
    await assert.rejects(
      readProviderKey(
        path.resolve("scripts/assistant-acceptance/.env.example"),
      ),
      /outside the checkout/,
    );
    const link = path.join(dir, "linked.env");
    await symlink(file, link);
    await assert.rejects(readProviderKey(link), /symlink/);
    await writeFile(
      file,
      "DEEPSEEK_API_KEY=fixture-only-provider-marker\nINTERNAL_API_TOKEN=forbidden\n",
    );
    await assert.rejects(readProviderKey(file), /only one/);
  } finally {
    await rm(dir, { recursive: true });
  }
});
test("native Redis listens locally and denies config, replication and foreign keys", async () => {
  const baseline = await preflight(options.workspace);
  const runDir = await makeRunDirectory(options.workspace, "acl-" + Date.now());
  const port = await freePort();
  const redis = await startRedis(runDir, port, baseline.redisBinary);
  try {
    await waitUntil(() => redisPing(port), { timeout: 10000 });
    assert.match(await command(port, ["CONFIG", "GET", "dir"]), /NOPERM/);
    assert.match(
      await command(port, ["REPLICAOF", "127.0.0.1", "9"]),
      /NOPERM/,
    );
    assert.match(await command(port, ["INCR", "foreign-key"]), /NOPERM/);
    assert.match(
      await command(port, ["INCR", "storefront-rate-limit:v1:fixture"]),
      /^:1/,
    );
  } finally {
    await redis.close();
  }
  assert.equal(await redisPing(port), false);
});
test(
  "two complete runs exercise the real route and SDK and leave all listeners closed",
  { timeout: 300000 },
  async () => {
    const results = [];
    for (let i = 0; i < 2; i++) {
      const result = await runHarness(options);
      assert.equal(
        result.result,
        "PASS",
        JSON.stringify({
          stage: result.failureStage,
          cases: result.cases.map((c) => ({ id: c.id, checks: c.checks })),
        }),
      );
      assert.equal(result.cases.length, 7);
      assert.equal(result.fixtureRequests.realProviderRequests, 0);
      assert.ok(result.fixtureRequests.providerRequests >= 14);
      assert.equal(
        result.fixtureRequests.backendRequests["/ai/shipping-estimate"],
        1,
      );
      await assertClosed(result);
      const artifact = await readFile(
        path.join(result.runDir, "report.json"),
        "utf8",
      );
      assert.doesNotMatch(artifact, /DEEPSEEK_API_KEY|INTERNAL_API_TOKEN/);
      results.push(result.runId);
    }
    assert.notEqual(results[0], results[1]);
  },
);
test(
  "injected startup failure cleans up its Redis and fixture processes",
  { timeout: 30000 },
  async () => {
    const result = await runHarness(options, { failAfter: "redis" });
    assert.equal(result.result, "ERROR");
    await assertClosed(result);
  },
);
test(
  "interruption after readiness cleans up Next, fixture and Redis",
  { timeout: 150000 },
  async () => {
    const controller = new AbortController();
    const result = await runHarness(options, {
      signal: controller.signal,
      onReady: () => controller.abort(),
    });
    assert.equal(result.result, "INTERRUPTED");
    await assertClosed(result);
  },
);

test(
  "CLI serve handles SIGTERM and closes all owned services",
  { timeout: 150000 },
  async () => {
    const child = spawn(
      process.execPath,
      ["scripts/assistant-acceptance/cli.mjs", "serve"],
      {
        env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let pending = "",
      runDir;
    child.stdout.on("data", (chunk) => {
      pending += chunk.toString();
      const lines = pending.split("\n");
      pending = lines.pop();
      for (const line of lines) {
        const value = JSON.parse(line);
        if (value.status === "READY") {
          runDir = value.runDir;
          child.kill("SIGTERM");
        }
      }
    });
    const timer = setTimeout(() => child.kill("SIGTERM"), 130000);
    try {
      const [code] = await once(child, "exit");
      assert.equal(code, 1);
      assert.ok(runDir);
      const report = JSON.parse(
        await readFile(path.join(runDir, "report.json"), "utf8"),
      );
      assert.equal(report.result, "INTERRUPTED");
      await assertClosed(report);
    } finally {
      clearTimeout(timer);
      if (child.exitCode === null) child.kill("SIGTERM");
    }
  },
);
