import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { cases, parseEvents, checkAnswer } from "./cases.mjs";
import { readProviderKey } from "./config.mjs";
import { startFixtureServer } from "./server.mjs";
import {
  delay,
  assertOwnedListener,
  freePort,
  makeRunDirectory,
  preflight,
  redisPing,
  restoreGeneratedTypes,
  startNext,
  startRedis,
  waitUntil,
} from "./lifecycle.mjs";
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function reportHtml(report) {
  return (
    '<!doctype html><html lang="en"><meta charset="utf-8"><title>Assistant acceptance</title><style>body{font:16px system-ui;max-width:900px;margin:40px auto;padding:0 20px}pre{white-space:pre-wrap}section{border-top:1px solid #bbb;padding:20px 0}a{display:block}</style><h1>Assistant acceptance: ' +
    escape(report.mode) +
    "</h1><p>Synthetic fixtures only. This report displays actual route output, not the storefront drawer. Deterministic results do not establish live model acceptance.</p>" +
    report.cases
      .map(
        (c) =>
          "<section><h2>" +
          escape(c.id) +
          " — " +
          (c.passed ? "PASS" : "FAIL") +
          "</h2><pre>" +
          escape(c.answer) +
          "</pre>" +
          c.sources
            .map(
              (s) =>
                '<a rel="noopener noreferrer" href="' +
                escape(s.url) +
                '">' +
                escape(s.title) +
                "</a>",
            )
            .join("") +
          "</section>",
      )
      .join("") +
    "</html>"
  );
}
export async function runHarness(
  options,
  { signal, onReady = () => {}, failAfter } = {},
) {
  // Read an explicitly selected private file only in live mode. Never inspect other profiles.
  const providerKey =
    options.mode === "live"
      ? await readProviderKey(options.keyFile)
      : undefined;
  const selected = options.caseId
    ? cases.filter((c) => c.id === options.caseId)
    : cases;
  if (!selected.length) throw new Error("Unknown acceptance case");
  const baseline = await preflight(options.workspace);
  if (options.command === "preflight")
    return { result: "PREFLIGHT_PASS", ...baseline, mode: options.mode };
  const runId = Date.now().toString(36) + "-" + randomUUID().slice(0, 8);
  const runDir = await makeRunDirectory(options.workspace, runId);
  const report = {
    schemaVersion: 1,
    runId,
    mode: options.mode,
    startedAt: new Date().toISOString(),
    ...baseline,
    cases: [],
    result: "STARTING",
    cleanup: { next: false, fixtures: false, redis: false },
    businessDataWrites: 0,
    ticketsSent: 0,
    emailsSent: 0,
  };
  let fixture, redis, next;
  let stage = "ports";
  try {
    const nextPort = await freePort();
    const redisPort = await freePort();
    stage = "fixtures";
    fixture = await startFixtureServer({
      mode: options.mode,
      storefrontOrigin: `http://127.0.0.1:${nextPort}`,
      providerKey,
    });
    report.fixtureProvenance = fixture.provenance;
    report.listeners = {
      next: { host: "127.0.0.1", port: nextPort },
      fixture: { host: "127.0.0.1", port: fixture.port },
      redis: { host: "127.0.0.1", port: redisPort },
    };
    stage = "redis-start";
    redis = await startRedis(runDir, redisPort, baseline.redisBinary);
    if (failAfter === "redis")
      throw new Error("Injected failure after Redis startup");
    stage = "redis-ready";
    await waitUntil(
      () => {
        if (redis.stopped) throw new Error("Owned Redis exited during startup");
        return redisPing(redisPort);
      },
      { timeout: 15000, signal },
    );
    stage = "redis-isolation";
    await assertOwnedListener(redisPort, redis.pid);
    report.redis = await redis.inspect();
    const url = `http://127.0.0.1:${nextPort}`;
    stage = "next-start";
    next = startNext({
      runDir,
      fixturePort: fixture.port,
      redisPort,
      nextPort,
      releaseSha: baseline.head,
    });
    report.listeners = {
      next: { host: "127.0.0.1", port: nextPort },
      fixture: { host: "127.0.0.1", port: fixture.port },
      redis: { host: "127.0.0.1", port: redisPort },
    };
    stage = "next-ready";
    await waitUntil(
      async () => {
        if (next.stopped)
          throw new Error("The isolated storefront exited during startup");
        try {
          return (
            await fetch(url + "/api/health", {
              signal: AbortSignal.timeout(1500),
            })
          ).ok;
        } catch {
          return false;
        }
      },
      { timeout: 120000, signal },
    );
    await assertOwnedListener(nextPort, next.pid, true);
    report.listenersVerifiedByOs = true;
    stage = "ready";
    await onReady({ url, runDir, runId, report });
    if (failAfter === "ready")
      throw new Error("Injected failure after storefront readiness");
    if (options.command === "serve") {
      while (!signal?.aborted) await delay(1000, signal);
      report.result = "INTERRUPTED";
    } else {
      for (const item of selected) {
        stage = "case:" + item.id;
        if (signal?.aborted) throw new Error("Run interrupted");
        const timeout = AbortSignal.timeout(120000);
        const response = await fetch(url + "/api/ai-shopping-assistant", {
          method: "POST",
          headers: { "content-type": "application/json", origin: url },
          body: JSON.stringify({
            messages: [{ role: "user", content: item.prompt }],
          }),
          signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
        });
        const raw = await response.text();
        if (raw.length > 2 * 1024 * 1024)
          throw new Error("Assistant response exceeded the bounded limit");
        const result = response.ok
          ? checkAnswer(item, parseEvents(raw))
          : {
              id: item.id,
              passed: false,
              checks: { http200: false },
              answer: "Assistant request failed; response details withheld",
              sources: [],
              tools: [],
            };
        report.cases.push({ ...result, httpStatus: response.status });
      }
      report.result = report.cases.every((c) => c.passed) ? "PASS" : "FAIL";
    }
  } catch {
    report.result = signal?.aborted ? "INTERRUPTED" : "ERROR";
    report.error =
      "Harness did not complete; no secret-bearing error details were recorded";
    report.failureStage = stage;
    if (next) report.nextDiagnostic = next.diagnostic;
  } finally {
    report.fixtureRequests = fixture?.stats;
    for (const [name, service] of [
      ["next", next],
      ["fixtures", fixture],
      ["redis", redis],
    ]) {
      try {
        if (service) await service.close();
        report.cleanup[name] = true;
      } catch {
        report.cleanup[name] = false;
        report.result = "CLEANUP_FAILED";
      }
    }
    try {
      await restoreGeneratedTypes(true);
      report.generatedTypesRestored = true;
    } catch {
      report.generatedTypesRestored = false;
      report.result = "CLEANUP_FAILED";
    }
    report.finishedAt = new Date().toISOString();
    const serialize = (value) => {
      const text = JSON.stringify(value, null, 2) + "\n";
      return providerKey ? text.split(providerKey).join("[REDACTED]") : text;
    };
    await writeFile(path.join(runDir, "report.json"), serialize(report), {
      mode: 0o600,
    });
    let html = reportHtml(report);
    if (providerKey) html = html.split(providerKey).join("[REDACTED]");
    await writeFile(path.join(runDir, "report.html"), html, { mode: 0o600 });
  }
  return { ...report, runDir };
}
