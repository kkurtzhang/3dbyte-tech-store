import assert from "node:assert/strict";
import net from "node:net";
import { once } from "node:events";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
const exec = promisify(execFile);
const guard = fileURLToPath(new URL("./network-guard.cjs", import.meta.url));
const env = {
  PATH: "/usr/bin:/bin",
  ACCEPTANCE_PORTS: "42001",
  TMPDIR: "/Volumes/MINI-M1/Codex/3dbyte-tech-store/tmp",
};
async function run(code, override = {}) {
  return exec(process.execPath, ["--require", guard, "-e", code], {
    env: { ...env, ...override },
    timeout: 5000,
  });
}
test("network guard blocks remote connections and unrelated loopback ports", async () => {
  for (const call of [
    "require('net').connect({host:'example.com',port:443})",
    "require('net').connect({host:'127.0.0.1',port:9000})",
    "require('https').get('https://example.com')",
  ]) {
    await assert.rejects(run(call), (error) =>
      /Acceptance network guard blocked/.test(error.stderr),
    );
  }
});
test("network guard blocks wildcard listeners and forces unspecified host to loopback", async () => {
  await assert.rejects(
    run("require('net').createServer().listen(42001,'0.0.0.0')"),
    (error) => /non-loopback/.test(error.stderr),
  );
  const result = await run(
    "const s=require('net').createServer();s.listen(0,()=>{console.log(s.address().address);s.close()})",
  );
  assert.equal(result.stdout.trim(), "127.0.0.1");
});
test("missing guard configuration fails closed", async () => {
  await assert.rejects(
    exec(process.execPath, ["--require", guard, "-e", "0"], {
      env: { PATH: "/usr/bin:/bin" },
      timeout: 5000,
    }),
    (error) => /explicit port allowlist/.test(error.stderr),
  );
});

test("network guard permits only the selected live loopback socket", async () => {
  const server = net.createServer((socket) => socket.end("local-ok"));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const port = server.address().port;
    const result = await run(
      "const s=require('net').connect({host:'127.0.0.1',port:" +
        port +
        "});s.on('data',d=>console.log(d.toString()))",
      { ACCEPTANCE_PORTS: String(port) },
    );
    assert.equal(result.stdout.trim(), "local-ok");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("object-form listeners cannot bind wildcard or outside-workspace sockets", async () => {
  await assert.rejects(
    run("require('net').createServer().listen({port:0,host:'0.0.0.0'})"),
    (error) => /non-loopback/.test(error.stderr),
  );
  await assert.rejects(
    run("require('net').createServer().listen({path:'/tmp/unrelated.sock'})"),
    (error) => /outside its workspace/.test(error.stderr),
  );
  const result = await run(
    "const s=require('net').createServer();s.listen({port:0},()=>{console.log(s.address().address);s.close()})",
  );
  assert.equal(result.stdout.trim(), "127.0.0.1");
});
