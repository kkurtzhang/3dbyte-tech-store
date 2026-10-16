// Explicit one-time setup. No service/daemon is installed or started.
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { parseOptions, requireSsdPath, SSD_ROOT } from "./config.mjs";
const exec = promisify(execFile);
const VERSION = "8.4.7";
const SHA256 =
  "ed83df9fcb724176fc901147aaa63830166e35c1cff39835c4fc9a5860ed1310";
const options = parseOptions(["preflight", ...process.argv.slice(2)]);
const workspace = path.resolve(options.workspace);
if (!workspace.startsWith(SSD_ROOT + "/"))
  throw new Error("Setup workspace must be on the external SSD");
let ancestor = workspace;
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
await mkdir(workspace, { recursive: true, mode: 0o700 });
await requireSsdPath(workspace);
const tools = path.join(workspace, "tools");
await mkdir(tools, { recursive: true });
await requireSsdPath(tools);
const tar = path.join(tools, `redis-${VERSION}.tar.gz`);
const source = path.join(tools, `redis-${VERSION}`);
const binary = path.join(source, "src/redis-server");
try {
  await stat(binary);
  console.log("Pinned Redis build already exists; setup left it unchanged.");
  process.exit(0);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const response = await fetch(
  `https://download.redis.io/releases/redis-${VERSION}.tar.gz`,
  { redirect: "error", signal: AbortSignal.timeout(30000) },
);
if (!response.ok) throw new Error("Official Redis download failed");
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash("sha256").update(bytes).digest("hex") !== SHA256)
  throw new Error("Official Redis archive checksum mismatch");
await writeFile(tar, bytes);
await exec("/usr/bin/tar", ["-xzf", tar, "-C", tools], { timeout: 30000 });
await requireSsdPath(source);
const tmp = path.join(tools, "tmp");
await mkdir(tmp, { recursive: true });
const result = await exec(
  "/usr/bin/make",
  ["-j4", "MALLOC=libc", "BUILD_TLS=no", "BUILD_WITH_MODULES=no"],
  {
    cwd: source,
    env: { PATH: "/usr/bin:/bin", TMPDIR: tmp },
    timeout: 300000,
    maxBuffer: 16 * 1024 * 1024,
  },
);
await writeFile(
  path.join(tools, "redis-build.log"),
  result.stdout + result.stderr,
);
const binarySha256 = createHash("sha256")
  .update(await readFile(binary))
  .digest("hex");
await writeFile(
  path.join(tools, "redis-install.json"),
  JSON.stringify(
    {
      version: VERSION,
      sourceUrl: `https://download.redis.io/releases/redis-${VERSION}.tar.gz`,
      sourceSha256: SHA256,
      binarySha256,
      binary,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({ result: "REDIS_BUILT_ON_SSD", version: VERSION, binary }),
);
