import { onlyKeys, record } from "./relay-conversation.mjs";

function stringsIn(value, depth = 0) {
  if (depth > 30) throw new Error("Response too deep");
  if (typeof value === "string") return [value];
  if (Array.isArray(value))
    return value.flatMap((v) => stringsIn(v, depth + 1));
  if (record(value))
    return Object.entries(value).flatMap(([k, v]) => [
      k,
      ...stringsIn(v, depth + 1),
    ]);
  return [];
}
function decodeEscapes(text) {
  let decoded = text.replace(
    /\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi,
    (full, a, b, c) => {
      const point = parseInt(a ?? b ?? c, 16);
      return point <= 0x10ffff ? String.fromCodePoint(point) : full;
    },
  );
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* Invalid URL encoding stays literal. */
  }
  return decoded;
}
function assertNoSecret(values, key) {
  if (!key) return;
  const representations = [
    key,
    Buffer.from(key).toString("base64"),
    Buffer.from(key).toString("hex"),
  ];
  for (const value of [...values, values.join("")]) {
    let candidate = value;
    for (let pass = 0; pass < 3; pass++) {
      if (representations.some((secret) => candidate.includes(secret)))
        throw new Error("Secret-bearing provider response");
      candidate = decodeEscapes(candidate);
    }
  }
}

// The entire bounded stream is parsed before ANY response headers/bytes reach Next.
// Re-encode only known protocol fields. Unknown, malformed, incomplete or secret-bearing
// content fails closed; raw SSE is never relayed or logged.
export function decodeProviderSse(text, key) {
  const blocks = text.replace(/\r\n?/g, "\n").split("\n\n");
  const allStrings = [];
  let done = false,
    finished = false,
    reason,
    content = "",
    reasoning = "",
    usage;
  const calls = new Map();
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .filter((line) => line && !line.startsWith(":"));
    if (!lines.length) continue;
    if (done || lines.some((line) => !line.startsWith("data:")))
      throw new Error("Invalid SSE framing");
    const data = lines
      .map((line) => line.slice(5).replace(/^ /, ""))
      .join("\n");
    if (data === "[DONE]") {
      done = true;
      continue;
    }
    const event = JSON.parse(data);
    allStrings.push(...stringsIn(event));
    onlyKeys(event, [
      "id",
      "object",
      "created",
      "model",
      "choices",
      "usage",
      "system_fingerprint",
      "service_tier",
    ]);
    if (!Array.isArray(event.choices) || event.choices.length > 1)
      throw new Error("Invalid choices");
    if (event.usage != null) {
      if (!record(event.usage)) throw new Error("Invalid usage");
      usage = {};
      for (const field of [
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
      ]) {
        const value = event.usage[field];
        if (value !== undefined) {
          if (!Number.isSafeInteger(value) || value < 0)
            throw new Error("Invalid usage count");
          usage[field] = value;
        }
      }
    }
    if (!event.choices.length) continue;
    if (finished) throw new Error("Content after finish");
    const choice = event.choices[0];
    onlyKeys(choice, ["index", "delta", "finish_reason", "logprobs"]);
    if (choice.index !== 0 || choice.logprobs != null)
      throw new Error("Unsupported choice");
    const delta = choice.delta;
    onlyKeys(delta, ["role", "content", "tool_calls", "reasoning_content"]);
    if (delta.role !== undefined && delta.role !== "assistant")
      throw new Error("Invalid response role");
    for (const field of ["content", "reasoning_content"]) {
      if (delta[field] != null && typeof delta[field] !== "string")
        throw new Error("Invalid text delta");
    }
    content += delta.content ?? "";
    reasoning += delta.reasoning_content ?? "";
    if (content.length > 32000 || reasoning.length > 32000)
      throw new Error("Text limit");
    if (delta.tool_calls !== undefined) {
      if (!Array.isArray(delta.tool_calls) || delta.tool_calls.length > 5)
        throw new Error("Tool count limit");
      for (const part of delta.tool_calls) {
        onlyKeys(part, ["index", "id", "type", "function"]);
        if (
          !Number.isInteger(part.index) ||
          part.index < 0 ||
          part.index > 4 ||
          (part.type !== undefined && part.type !== "function")
        )
          throw new Error("Invalid tool delta");
        if (part.function !== undefined)
          onlyKeys(part.function, ["name", "arguments"]);
        const call = calls.get(part.index) ?? {
          id: "",
          type: "function",
          function: { name: "", arguments: "" },
        };
        for (const [target, field, value] of [
          [call, "id", part.id],
          [call.function, "name", part.function?.name],
          [call.function, "arguments", part.function?.arguments],
        ]) {
          if (value !== undefined) {
            if (typeof value !== "string")
              throw new Error("Invalid tool string");
            target[field] += value;
            if (target[field].length > 16000)
              throw new Error("Tool field limit");
          }
        }
        calls.set(part.index, call);
      }
    }
    if (choice.finish_reason != null) {
      if (
        !["stop", "tool_calls", "length", "content_filter"].includes(
          choice.finish_reason,
        )
      )
        throw new Error("Invalid finish reason");
      reason = choice.finish_reason;
      finished = true;
    }
  }
  if (!done || !finished || calls.size > 0 !== (reason === "tool_calls"))
    throw new Error("Incomplete provider stream");
  const toolCalls = [...calls.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, call], order) => {
      if (index !== order) throw new Error("Missing tool index");
      const args = JSON.parse(call.function.arguments);
      if (!record(args)) throw new Error("Invalid tool arguments");
      allStrings.push(
        call.id,
        call.function.name,
        call.function.arguments,
        ...stringsIn(args),
      );
      return call;
    });
  assertNoSecret([content, reasoning, ...allStrings], key);
  // Thinking is explicitly disabled on outbound requests; unexpected reasoning is withheld.
  if (reasoning) throw new Error("Unexpected reasoning content");
  const assistant = { role: "assistant", content: content || null };
  if (toolCalls.length) assistant.tool_calls = toolCalls;
  return { assistant, reason, usage };
}
export function encodeProviderSse({ assistant, reason, usage }) {
  const chunk = (delta, finish_reason) => ({
    id: "acceptance-relay",
    object: "chat.completion.chunk",
    created: 1,
    model: "deepseek-flash",
    choices: [{ index: 0, delta, finish_reason }],
  });
  const delta = {
    role: "assistant",
    ...(assistant.content === null ? {} : { content: assistant.content }),
  };
  if (assistant.tool_calls)
    delta.tool_calls = assistant.tool_calls.map((call, index) => ({
      index,
      ...call,
    }));
  const events = [chunk(delta, null), chunk({}, reason)];
  if (usage)
    events.push({
      id: "acceptance-relay",
      object: "chat.completion.chunk",
      created: 1,
      model: "deepseek-flash",
      choices: [],
      usage,
    });
  return (
    events.map((event) => "data: " + JSON.stringify(event) + "\n\n").join("") +
    "data: [DONE]\n\n"
  );
}
