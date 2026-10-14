import { spawn } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { constants } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ADVISORY = "GHSA-vfj7-8cjw-p6xm";
export const EXPIRES_AT = "2026-10-21T00:00:00Z";
const repository = "kkurtzhang/3dbyte-tech-store";

function eligible(cwd, env, now) {
  if (!Number.isFinite(now)) throw new Error("Invalid audit exception clock");
  if (now >= Date.parse(EXPIRES_AT)) return false;
  if (env.GITHUB_ACTIONS !== "true" || env.GITHUB_REPOSITORY !== repository)
    return false;
  if (
    !env.GITHUB_WORKSPACE ||
    realpathSync(env.GITHUB_WORKSPACE) !== realpathSync(cwd)
  )
    return false;
  return (
    (env.GITHUB_EVENT_NAME === "pull_request" &&
      env.GITHUB_BASE_REF === "staging" &&
      /^refs\/pull\/[1-9]\d*\/merge$/.test(env.GITHUB_REF || "")) ||
    (env.GITHUB_EVENT_NAME === "push" &&
      env.GITHUB_REF === "refs/heads/staging")
  );
}

function objectOrEmpty(value, label) {
  if (value === undefined) return {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label} in package.json`);
  }
  return value;
}

function temporaryManifest(original) {
  const manifest = objectOrEmpty(JSON.parse(original), "manifest");
  const pnpm = objectOrEmpty(manifest.pnpm, "pnpm");
  const auditConfig = objectOrEmpty(pnpm.auditConfig, "pnpm.auditConfig");
  const ignores = auditConfig.ignoreGhsas ?? [];
  if (!Array.isArray(ignores) || ignores.some((id) => typeof id !== "string")) {
    throw new Error("Invalid pnpm.auditConfig.ignoreGhsas in package.json");
  }
  if (ignores.includes(ADVISORY)) {
    throw new Error(
      "The temporary staging advisory must not be permanently ignored",
    );
  }
  return (
    JSON.stringify(
      {
        ...manifest,
        pnpm: {
          ...pnpm,
          auditConfig: { ...auditConfig, ignoreGhsas: [...ignores, ADVISORY] },
        },
      },
      null,
      2,
    ) + "\n"
  );
}

function runPnpmAudit({ cwd, env }) {
  return new Promise((resolveAudit, reject) => {
    const child = spawn("pnpm", ["audit", "--audit-level=high"], {
      cwd,
      env,
      stdio: "inherit",
    });
    let timer;
    let receivedSignal;
    const handlers = new Map();
    for (const signal of ["SIGINT", "SIGTERM"]) {
      const handler = () => {
        receivedSignal ||= signal;
        child.kill(signal);
        timer ||= setTimeout(() => child.kill("SIGKILL"), 5000);
      };
      handlers.set(signal, handler);
      process.on(signal, handler);
    }
    const cleanup = () => {
      clearTimeout(timer);
      for (const [signal, handler] of handlers) process.off(signal, handler);
    };
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("close", (code, signal) => {
      cleanup();
      const interrupted = receivedSignal || signal;
      resolveAudit(
        interrupted ? 128 + constants.signals[interrupted] : (code ?? 1),
      );
    });
  });
}

export async function runAudit({
  cwd = process.cwd(),
  env = process.env,
  now = Date.now(),
  audit = runPnpmAudit,
} = {}) {
  if (!eligible(cwd, env, now)) {
    console.log("Ordinary dependency audit: no staging exception applies.");
    return audit({ cwd, env });
  }
  const manifestPath = resolve(cwd, "package.json");
  if (!lstatSync(manifestPath).isFile())
    throw new Error("package.json must be a regular file");
  const original = readFileSync(manifestPath);
  const temporary = temporaryManifest(original);
  console.log(
    `Temporary staging risk acceptance: ${ADVISORY}; expires ${EXPIRES_AT}. Other audit gates remain active.`,
  );
  try {
    writeFileSync(manifestPath, temporary);
    return await audit({ cwd, env });
  } finally {
    writeFileSync(manifestPath, original);
    console.log("Original package.json restored.");
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const expected = ["--", "pnpm", "audit", "--audit-level=high"];
    if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(expected)) {
      throw new Error(
        "Usage: node staging-audit-exception.mjs -- pnpm audit --audit-level=high",
      );
    }
    process.exitCode = await runAudit();
  } catch (error) {
    console.error(`Dependency audit failed: ${error.message}`);
    process.exitCode = 1;
  }
}
