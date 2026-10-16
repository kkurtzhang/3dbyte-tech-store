import { cases } from "./cases.mjs";
import contract from "./provider-contract.json" with { type: "json" };
import { fixtureToolResult, normalizeFixtureCall } from "./relay-tools.mjs";

export const record = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);
export function onlyKeys(value, allowed) {
  if (!record(value) || Object.keys(value).some((k) => !allowed.includes(k)))
    throw new Error("Unexpected fields");
}
export function canonical(value, depth = 0) {
  if (depth > 30) throw new Error("Structure too deep");
  if (Array.isArray(value)) return value.map((v) => canonical(v, depth + 1));
  if (record(value))
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k], depth + 1)]),
    );
  return value;
}
export const signature = (value) => JSON.stringify(canonical(value));
const equal = (a, b) => signature(a) === signature(b);
function textContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content) || !content.length)
    throw new Error("Expected text");
  return content
    .map((part) => {
      onlyKeys(part, ["type", "text"]);
      if (part.type !== "text" || typeof part.text !== "string")
        throw new Error("Expected text part");
      return part.text;
    })
    .join("");
}
function normalize(message) {
  if (message?.role === "system" || message?.role === "user") {
    onlyKeys(message, ["role", "content"]);
    return { role: message.role, content: textContent(message.content) };
  }
  if (message?.role === "assistant") {
    onlyKeys(message, ["role", "content", "tool_calls"]);
    if (message.content != null && typeof message.content !== "string")
      throw new Error("Invalid assistant content");
    const result = { role: "assistant", content: message.content || null };
    if (message.tool_calls !== undefined) {
      if (
        !Array.isArray(message.tool_calls) ||
        !message.tool_calls.length ||
        message.tool_calls.length > 5
      )
        throw new Error("Invalid tool calls");
      result.tool_calls = message.tool_calls.map((call) => {
        onlyKeys(call, ["id", "type", "function"]);
        onlyKeys(call.function, ["name", "arguments"]);
        if (
          call.type !== "function" ||
          typeof call.id !== "string" ||
          !/^[a-zA-Z0-9_-]{1,100}$/.test(call.id) ||
          typeof call.function.name !== "string" ||
          typeof call.function.arguments !== "string"
        )
          throw new Error("Invalid tool call");
        return {
          id: call.id,
          type: "function",
          function: {
            name: call.function.name,
            arguments: signature(JSON.parse(call.function.arguments)),
          },
        };
      });
    }
    return result;
  }
  if (message?.role === "tool") {
    onlyKeys(message, ["role", "content", "tool_call_id"]);
    if (
      typeof message.tool_call_id !== "string" ||
      typeof message.content !== "string"
    )
      throw new Error("Invalid tool result");
    return {
      role: "tool",
      tool_call_id: message.tool_call_id,
      content: signature(JSON.parse(message.content)),
    };
  }
  throw new Error("Unexpected conversation role");
}

export function createConversationBoundary(data, origin) {
  const continuations = new Map();
  function prepare(body) {
    onlyKeys(body, [
      "model",
      "stream",
      "messages",
      "tools",
      "temperature",
      "max_tokens",
      "tool_choice",
      "stream_options",
      "thinking",
    ]);
    if (
      body.model !== "deepseek-flash" ||
      body.stream !== true ||
      !Array.isArray(body.messages) ||
      body.messages.length > 40
    )
      throw new Error("Invalid provider request");
    for (const [key, value] of Object.entries({
      temperature: 0.2,
      max_tokens: 1800,
      tool_choice: "auto",
      stream_options: { include_usage: true },
      thinking: { type: "disabled" },
    })) {
      if (body[key] !== undefined && !equal(body[key], value))
        throw new Error("Unapproved request option");
    }
    if (body.tools !== undefined && !equal(body.tools, contract.tools))
      throw new Error("Unapproved tool definitions");
    const messages = body.messages.map(normalize);
    if (messages[0]?.role !== "system")
      messages.unshift(structuredClone(contract.system));
    if (!equal(messages[0], contract.system) || messages[1]?.role !== "user")
      throw new Error("Unapproved system or history");
    const item = cases.find((c) => c.prompt === messages[1].content);
    if (!item) throw new Error("Unapproved user prompt");
    const key = signature(messages);
    if (messages.length !== 2) {
      const alternatives = continuations.get(key);
      if (!alternatives) throw new Error("Unissued or altered continuation");
      for (const alternative of alternatives) continuations.delete(alternative);
    }
    return {
      item,
      messages,
      body: {
        model: "deepseek-flash",
        stream: true,
        temperature: 0.2,
        max_tokens: 1800,
        tool_choice: "auto",
        stream_options: { include_usage: true },
        thinking: { type: "disabled" },
        tools: structuredClone(
          contract.tools.filter(
            (t) => t.function.name !== "createSupportTicket",
          ),
        ),
        messages,
      },
    };
  }
  function complete(prepared, assistant) {
    const normalized = normalize({
      ...assistant,
      ...(assistant.tool_calls
        ? { tool_calls: assistant.tool_calls.map(normalizeFixtureCall) }
        : {}),
    });
    const calls = normalized.tool_calls ?? [];
    if (new Set(calls.map((c) => c.id)).size !== calls.length)
      throw new Error("Duplicate tool calls");
    const previous = prepared.messages.flatMap((m) =>
      m.role === "assistant" ? (m.tool_calls ?? []) : [],
    );
    const replies = calls.map((call, index) => ({
      role: "tool",
      tool_call_id: call.id,
      content: signature(
        fixtureToolResult(call, data, origin, prepared.item, [
          ...previous,
          ...calls.slice(0, index),
        ]),
      ),
    }));
    if (
      calls.length &&
      prepared.messages.filter((m) => m.role === "assistant").length < 4
    ) {
      // The reviewed grounding transform can remove provider prose from SDK history.
      // Accept only the issued text or its complete omission, never a replacement.
      const alternatives = new Set(
        [normalized, { ...normalized, content: null }].map((message) =>
          signature([...prepared.messages, message, ...replies]),
        ),
      );
      for (const alternative of alternatives)
        continuations.set(alternative, alternatives);
    }
    return normalized;
  }
  return { prepare, complete };
}
