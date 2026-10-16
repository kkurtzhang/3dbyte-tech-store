"use strict";
// Process-local guard, applied only to the disposable Next process and its children.
// The provider key never enters this process. No system firewall/settings are changed.
const net = require("node:net");
const path = require("node:path");
const ports = new Set(
  (process.env.ACCEPTANCE_PORTS || "")
    .split(",")
    .map(Number)
    .filter((n) => n > 0),
);
if (!ports.size)
  throw new Error("Acceptance network guard needs an explicit port allowlist");
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options =
    typeof first === "object"
      ? first
      : {
          port: first,
          host: typeof args[1] === "string" ? args[1] : "127.0.0.1",
        };
  const host = options.host || "127.0.0.1";
  if (
    !["127.0.0.1", "::1", "localhost"].includes(host) ||
    !ports.has(Number(options.port))
  ) {
    throw new Error("Acceptance network guard blocked an outbound connection");
  }
  return originalConnect.apply(this, args);
};
const originalListen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  if (typeof args[0] === "object" && args[0] !== null) {
    if (args[0].path) {
      if (
        !path
          .resolve(args[0].path)
          .startsWith(path.resolve(process.env.TMPDIR) + path.sep)
      )
        throw new Error(
          "Acceptance guard blocked a socket outside its workspace",
        );
    } else {
      if (
        args[0].host &&
        !["127.0.0.1", "::1", "localhost"].includes(args[0].host)
      )
        throw new Error("Acceptance guard blocked a non-loopback listener");
      args[0] = { ...args[0], host: "127.0.0.1" };
    }
  } else if (typeof args[0] === "number") {
    if (
      typeof args[1] === "string" &&
      !["127.0.0.1", "::1", "localhost"].includes(args[1])
    )
      throw new Error("Acceptance guard blocked a non-loopback listener");
    if (typeof args[1] !== "string") args.splice(1, 0, "127.0.0.1");
  } else throw new Error("Acceptance guard blocked an unspecified listener");
  return originalListen.apply(this, args);
};
