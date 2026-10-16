import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { once } from "node:events";
import net from "node:net";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  APP,
  BASE_SHA,
  REPO,
  SSD_ROOT,
  rejectEnvFiles,
  requireSsdPath,
  childEnvironment,
} from "./config.mjs";
const exec = promisify(execFile);
export async function git(args) {
  return (await exec("git", args, { cwd: REPO, timeout: 10000 })).stdout.trim();
}
export async function restoreGeneratedTypes(restore = false) {
  const file = path.join(APP, "next-env.d.ts");
  const original = (
    await exec(
      "git",
      ["show", BASE_SHA + ":apps/storefront-v3/next-env.d.ts"],
      { cwd: REPO, timeout: 10000 },
    )
  ).stdout;
  const current = await readFile(file, "utf8");
  if (
    current !== original &&
    current !== original.replaceAll("./.next/types/", "./.next/dev/types/")
  )
    throw new Error("Unexpected next-env.d.ts edits were preserved");
  if (restore && current !== original) await writeFile(file, original);
}
export async function preflight(workspace) {
  await requireSsdPath(REPO);
  await requireSsdPath(APP);
  await rejectEnvFiles();
  await git(["merge-base", "--is-ancestor", BASE_SHA, "HEAD"]);
  await git([
    "diff",
    "--exit-code",
    BASE_SHA,
    "--",
    "apps/storefront-v3",
    "packages",
    "package.json",
    "pnpm-lock.yaml",
    ":(exclude)apps/storefront-v3/next-env.d.ts",
  ]);
  await restoreGeneratedTypes();
  const runtimeStatus = await git([
    "ls-files",
    "--others",
    "--exclude-standard",
    "apps/storefront-v3/src",
    "packages",
  ]);
  if (runtimeStatus)
    throw new Error("Untracked runtime sources are not accepted");
  await requireSsdPath(path.join(APP, "node_modules/next/dist/bin/next"));
  const tools = path.join(await requireSsdPath(workspace), "tools");
  const receipt = JSON.parse(
    await readFile(path.join(tools, "redis-install.json"), "utf8"),
  );
  const binary = await requireSsdPath(
    path.join(tools, "redis-8.4.7/src/redis-server"),
  );
  const binaryHash = createHash("sha256")
    .update(await readFile(binary))
    .digest("hex");
  if (
    receipt.sourceSha256 !==
      "ed83df9fcb724176fc901147aaa63830166e35c1cff39835c4fc9a5860ed1310" ||
    binaryHash !== receipt.binarySha256
  )
    throw new Error(
      "Pinned Redis installation does not match its setup receipt",
    );
  const redisVersion = (
    await exec(binary, ["--version"], { timeout: 10000 })
  ).stdout.trim();
  return {
    head: await git(["rev-parse", "HEAD"]),
    base: BASE_SHA,
    runtimeMatchesReviewedHead: true,
    redisVersion,
    redisBinary: binary,
    redisBinarySha256: binaryHash,
    redisSourceSha256: receipt.sourceSha256,
  };
}
export async function makeRunDirectory(workspace, runId) {
  const absolute = path.resolve(workspace);
  if (!absolute.startsWith(SSD_ROOT + path.sep))
    throw new Error("Workspace must be on the external SSD");
  let ancestor = absolute;
  while (true) {
    try {
      await stat(ancestor);
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      ancestor = path.dirname(ancestor);
    }
  }
  await requireSsdPath(ancestor);
  await mkdir(absolute, { recursive: true, mode: 0o700 });
  await requireSsdPath(absolute);
  const runDir = path.join(await realpath(absolute), "runs", runId);
  await mkdir(runDir, { recursive: true, mode: 0o700 });
  for (const name of ["tmp", "cache", "config"])
    await mkdir(path.join(runDir, name), { mode: 0o700 });
  return runDir;
}
export async function freePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
export async function delay(ms, signal) {
  if (signal?.aborted) throw new Error("Run interrupted");
  await new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new Error("Run interrupted"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}
export async function waitUntil(check, { timeout = 90000, signal } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error("Run interrupted");
    if (await check()) return;
    await delay(300, signal);
  }
  throw new Error(
    "Service did not become ready within the bounded startup timeout",
  );
}
export async function redisPing(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    let data = "";
    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(1000, () => finish(false));
    socket.on("error", () => finish(false));
    socket.on("connect", () => socket.write("*1\r\n$4\r\nPING\r\n"));
    socket.on("data", (chunk) => {
      data += chunk.toString();
      if (data.includes("\r\n")) finish(data === "+PONG\r\n");
    });
  });
}
export async function assertOwnedListener(port, pid, processGroup = false) {
  const output = (
    await exec(
      "/usr/sbin/lsof",
      ["-nP", "-iTCP:" + port, "-sTCP:LISTEN", "-Fpn"],
      { timeout: 5000 },
    )
  ).stdout;
  const lines = output.trim().split("\n");
  const names = lines
    .filter((line) => line.startsWith("n"))
    .map((line) => line.slice(1));
  const pids = [
    ...new Set(
      lines
        .filter((line) => line.startsWith("p"))
        .map((line) => Number(line.slice(1))),
    ),
  ];
  if (
    !names.length ||
    names.some((name) => name !== "127.0.0.1:" + port) ||
    !pids.length
  )
    throw new Error("Listener is not exclusively loopback");
  for (const owner of pids) {
    const actual = processGroup
      ? Number(
          (
            await exec("/bin/ps", ["-o", "pgid=", "-p", String(owner)], {
              timeout: 5000,
            })
          ).stdout.trim(),
        )
      : owner;
    if (actual !== pid)
      throw new Error("Listener does not belong to this harness invocation");
  }
}
export async function startRedis(runDir, port, binary) {
  const dir = path.join(runDir, "redis");
  await mkdir(dir, { mode: 0o700 });
  const child = spawn(
    binary,
    [
      "--bind",
      "127.0.0.1",
      "--port",
      String(port),
      "--protected-mode",
      "yes",
      "--daemonize",
      "no",
      "--save",
      "",
      "--appendonly",
      "no",
      "--dir",
      dir,
      "--databases",
      "1",
      "--maxmemory",
      "16mb",
      "--maxmemory-policy",
      "allkeys-lru",
      "--user",
      "default",
      "on",
      "nopass",
      "resetkeys",
      "~storefront-rate-limit:v1:*",
      "-@all",
      "+ping",
      "+info",
      "+client|setinfo",
      "+client|setname",
      "+select",
      "+quit",
      "+eval",
      "+incr",
      "+pexpire",
      "+pttl",
    ],
    {
      cwd: dir,
      env: { PATH: "/usr/bin:/bin", TMPDIR: path.join(runDir, "tmp") },
      stdio: "ignore",
    },
  );
  const exited = new Promise((resolve) => {
    child.once("exit", resolve);
    child.once("error", resolve);
  });
  return {
    pid: child.pid,
    get stopped() {
      return child.exitCode !== null || child.signalCode !== null;
    },
    async inspect() {
      return {
        hostBind: "127.0.0.1",
        persistence: false,
        databases: 1,
        acl: "Rate-limit commands and key prefix only; no replication, migration, config, files or module commands",
      };
    },
    async close() {
      if (child.pid && child.exitCode === null && child.signalCode === null)
        child.kill("SIGTERM");
      await Promise.race([exited, delay(3000)]);
      if (child.pid && child.exitCode === null && child.signalCode === null)
        child.kill("SIGKILL");
      await exited;
    },
  };
}
export function startNext(config) {
  const env = childEnvironment(config);
  let diagnostic = "";
  const child = spawn(
    process.execPath,
    [
      path.join(APP, "node_modules/next/dist/bin/next"),
      "dev",
      "--webpack",
      "-H",
      "127.0.0.1",
      "-p",
      String(config.nextPort),
    ],
    { cwd: APP, env, detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  const capture = (chunk) => {
    let text = chunk.toString();
    for (const value of Object.values(env).filter((v) => v.length >= 6))
      text = text.split(value).join("[configured]");
    diagnostic = (diagnostic + text).slice(-12000);
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  const exited = new Promise((resolve) => {
    child.once("exit", resolve);
    child.once("error", resolve);
  });
  return {
    pid: child.pid,
    get diagnostic() {
      return diagnostic;
    },
    get stopped() {
      return child.exitCode !== null || child.signalCode !== null;
    },
    async close() {
      if (!child.pid) return;
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
      await Promise.race([exited, delay(4000)]);
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
      await exited;
    },
  };
}
