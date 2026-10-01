import { createServer } from "node:net";

import type { Socket } from "node:net";

// A TCP RESP fixture exercises ioredis connection startup without an external Redis.
export async function startRedisProtocolServer(stall = false) {
  const sockets = new Set<Socket>();
  const counts = new Map<string, number>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    if (stall) return;

    let buffer = "";
    socket.on("data", (data) => {
      buffer += data.toString();
      let parsed = parseCommand(buffer);
      while (parsed) {
        buffer = buffer.slice(parsed.consumed);
        const [command, ...args] = parsed.args;
        if (command.toLowerCase() === "info") {
          const info = "redis_version:7.0.0\r\nloading:0\r\n";
          socket.write(`$${Buffer.byteLength(info)}\r\n${info}\r\n`);
        } else if (command.toLowerCase() === "eval") {
          const key = args[2];
          const count = (counts.get(key) ?? 0) + 1;
          counts.set(key, count);
          socket.write(`*2\r\n:${count}\r\n:${args[3]}\r\n`);
        } else {
          socket.write("+OK\r\n");
        }
        parsed = parseCommand(buffer);
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("TCP port missing");

  return {
    url: `redis://127.0.0.1:${address.port}`,
    close: async () => {
      sockets.forEach((socket) => socket.destroy());
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

function parseCommand(buffer: string) {
  const headerEnd = buffer.indexOf("\r\n");
  if (headerEnd < 0) return null;
  const count = Number(buffer.slice(1, headerEnd));
  let offset = headerEnd + 2;
  const args: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const end = buffer.indexOf("\r\n", offset);
    if (end < 0) return null;
    const length = Number(buffer.slice(offset + 1, end));
    const start = end + 2;
    if (buffer.length < start + length + 2) return null;
    args.push(buffer.slice(start, start + length));
    offset = start + length + 2;
  }
  return { args, consumed: offset };
}
