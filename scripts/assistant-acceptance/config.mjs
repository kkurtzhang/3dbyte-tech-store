import { constants } from "node:fs";
import { open, realpath, lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIXTURE_MARKER } from "./fixtures.mjs";
export const BASE_SHA = "96ebebd062f81b370b394e988aec77e06a2bb082";
export const SSD_ROOT = "/Volumes/MINI-M1";
export const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const APP = path.join(REPO, "apps/storefront-v3");
export function parseOptions(args) {
  const options = {
    command: args[0] ?? "run",
    mode: "deterministic",
    workspace: SSD_ROOT + "/Codex/3dbyte-tech-store/local-assistant-acceptance",
    keyFile: undefined,
    caseId: undefined,
  };
  if (!["run", "serve", "preflight"].includes(options.command))
    throw new Error("Use run, serve, or preflight");
  const flags = {
    "--mode": "mode",
    "--workspace": "workspace",
    "--key-file": "keyFile",
    "--case": "caseId",
  };
  for (let i = 1; i < args.length; i += 2) {
    if (!flags[args[i]] || !args[i + 1] || args[i + 1].startsWith("--"))
      throw new Error("Unknown or incomplete option");
    options[flags[args[i]]] = args[i + 1];
  }
  if (!["deterministic", "live"].includes(options.mode))
    throw new Error("Mode must be deterministic or live");
  if (options.mode === "deterministic" && options.keyFile)
    throw new Error("Key files are accepted only in explicit live mode");
  return options;
}
export function providerKeyFromText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"));
  if (
    lines.length !== 1 ||
    !/^DEEPSEEK_API_KEY=[A-Za-z0-9_.-]{12,300}$/.test(lines[0])
  )
    throw new Error(
      "Private config must contain only one nonempty DEEPSEEK_API_KEY assignment",
    );
  return lines[0].slice("DEEPSEEK_API_KEY=".length);
}
export async function requireSsdPath(input) {
  const resolved = await realpath(input);
  const ssd = await realpath(SSD_ROOT);
  if (!resolved.startsWith(ssd + path.sep))
    throw new Error("Path must be inside the external SSD");
  return resolved;
}
export async function readProviderKey(file) {
  if (!file)
    throw new Error(
      "Live mode needs --key-file pointing to user-owned private configuration; nothing has started",
    );
  const resolved = await requireSsdPath(file);
  if (resolved.startsWith(REPO + path.sep))
    throw new Error("Provider configuration must be outside the checkout");
  if ((await lstat(file)).isSymbolicLink())
    throw new Error("Provider configuration cannot be a symlink");
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (
      !stat.isFile() ||
      stat.size > 4096 ||
      (stat.mode & 0o077) !== 0 ||
      stat.uid !== process.getuid()
    )
      throw new Error(
        "Private config must be owner-only (chmod 600), owned by this user, and at most 4 KiB",
      );
    return providerKeyFromText(await handle.readFile("utf8"));
  } finally {
    await handle.close();
  }
}
export async function rejectEnvFiles() {
  for (const dir of [REPO, APP]) {
    const files = await readdir(dir);
    if (
      files.some(
        (n) =>
          (n === ".env" || n.startsWith(".env.")) &&
          ![".env.example", ".env.template", ".env.test.example"].includes(n),
      )
    )
      throw new Error(
        "Use an isolated checkout without runtime .env files; no file was read",
      );
  }
}
export function childEnvironment({
  runDir,
  fixturePort,
  redisPort,
  nextPort,
  releaseSha,
}) {
  return {
    PATH: path.dirname(process.execPath) + ":/usr/bin:/bin",
    TMPDIR: path.join(runDir, "tmp"),
    XDG_CACHE_HOME: path.join(runDir, "cache"),
    XDG_CONFIG_HOME: path.join(runDir, "config"),
    NODE_ENV: "development",
    NEXT_TELEMETRY_DISABLED: "1",
    OTEL_ENABLED: "false",
    LANGFUSE_ENABLED: "false",
    AI_PROVIDER: "deepseek",
    AI_MODEL: "deepseek-flash",
    AI_ASSISTANT_TEMPERATURE: "0.2",
    DEEPSEEK_API_KEY: FIXTURE_MARKER,
    INTERNAL_API_TOKEN: FIXTURE_MARKER,
    DEEPSEEK_BASE_URL: `http://127.0.0.1:${fixturePort}`,
    MEDUSA_SERVER_BACKEND_URL: `http://127.0.0.1:${fixturePort}`,
    NEXT_PUBLIC_MEDUSA_BACKEND_URL: `http://127.0.0.1:${fixturePort}`,
    NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${nextPort}`,
    RATE_LIMIT_REDIS_URL: `redis://127.0.0.1:${redisPort}/0`,
    STOREFRONT_RELEASE_SHA: releaseSha,
    ACCEPTANCE_PORTS: [fixturePort, redisPort, nextPort].join(","),
    NODE_OPTIONS:
      "--require=" +
      path.join(REPO, "scripts/assistant-acceptance/network-guard.cjs"),
  };
}
