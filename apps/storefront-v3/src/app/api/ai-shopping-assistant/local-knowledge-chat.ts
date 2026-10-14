import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { z } from "zod";

import {
  assembleLocalKnowledgeReply,
  createLocalKnowledgeTool,
  getLocalKnowledgeConfig,
  readBoundedBody,
  localClarificationContext,
} from "./local-knowledge";

import { resolveLocalKnowledgeFocus } from "./local-knowledge-focus";
import { resolveLocalRetailerFocus } from "./local-retailer-reference-focus";
import { supplierBomComparisonRequested } from "./supplier-bom-intent";
import { officialResourceRequested } from "./official-resource-intent";
import {
  resolveThreeDSetsResources,
  streamThreeDSetsResources,
} from "./three-d-sets-resources";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000).optional(),
        parts: z
          .array(
            z.object({
              type: z.string(),
              text: z.string().max(4000).optional(),
            }),
          )
          .max(40)
          .optional(),
      }),
    )
    .min(1)
    .max(20),
});

let windowStart = 0;
let requests = 0;

function localRequestAllowed(req: Request): boolean {
  const url = new URL(req.url);
  const loopback = (host: string) =>
    host === "127.0.0.1" || host === "localhost";
  if (!loopback(url.hostname)) return false;
  const host = req.headers.get("host");
  const authority = host ? new URL("http://" + host) : url;
  if (
    !loopback(authority.hostname) ||
    authority.port !== url.port ||
    authority.username ||
    authority.password
  )
    return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const originUrl = new URL(origin);
  return (
    loopback(originUrl.hostname) &&
    originUrl.port === url.port &&
    originUrl.protocol === url.protocol
  );
}

export async function handleLocalKnowledgeChat(
  req: Request,
): Promise<Response> {
  try {
    const config = getLocalKnowledgeConfig();
    if (!config || !localRequestAllowed(req))
      return Response.json(
        { error: "Local development loopback access required" },
        { status: 403 },
      );
    const now = Date.now();
    if (now - windowStart >= 60000) {
      windowStart = now;
      requests = 0;
    }
    if (++requests > 30)
      return Response.json(
        { error: "Local assistant request limit reached" },
        { status: 429 },
      );
    const body = requestSchema.parse(
      JSON.parse(await readBoundedBody(req, 64000)),
    );
    const latest = [...body.messages]
      .reverse()
      .find((message) => message.role === "user");
    const question = z
      .string()
      .trim()
      .min(1)
      .max(500)
      .parse(
        latest?.content ??
          latest?.parts
            ?.filter((part) => part.type === "text")
            .map((part) => part.text || "")
            .join("") ??
          "",
      );
    if (
      /\b(?:order|cart|customer|cus)_[a-z0-9_]+|[^\s@]+@[^\s@]+\.[^\s@]+|\b(?:my order|track my|my account)\b/i.test(
        question,
      )
    ) {
      return Response.json(
        {
          error:
            "This local knowledge path accepts product/material questions without customer data.",
        },
        { status: 400 },
      );
    }
    const retailerFocus = resolveLocalRetailerFocus(body.messages);
    const wantsResource = officialResourceRequested(question);
    const resources =
      resolveThreeDSetsResources(body.messages) ??
      (wantsResource && retailerFocus
        ? resolveThreeDSetsResources([
            ...body.messages,
            { role: "user" as const, content: "3D Sets. " + question },
          ])
        : null);
    if (
      resources &&
      (!retailerFocus || wantsResource) &&
      !supplierBomComparisonRequested(question)
    )
      return streamThreeDSetsResources(resources);
    const focus = retailerFocus ?? resolveLocalKnowledgeFocus(body.messages);
    const context =
      focus.mode === "clarify"
        ? localClarificationContext(focus.reason, focus.subjects)
        : await createLocalKnowledgeTool(config, req.signal).execute({
            question: focus.question,
            groupKey: focus.groupKey,
          });
    const reply = assembleLocalKnowledgeReply(context);
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({
          type: "start",
          messageId: "local-knowledge-" + crypto.randomUUID(),
        });
        writer.write({
          type: "data-local-knowledge",
          data: {
            ...context,
            conversation_focus: {
              mode: focus.mode,
              subjects: focus.subjects,
              group_key: focus.groupKey || null,
              reason: focus.reason,
              supplier_variant_selected: false,
            },
            context_assembly: {
              selected_claim_ids: reply.claimIds,
              selection: "leading_record",
              model_generation: false,
            },
          },
        });
        writer.write({ type: "text-start", id: "local-context" });
        writer.write({
          type: "text-delta",
          id: "local-context",
          delta: reply.text,
        });
        writer.write({ type: "text-end", id: "local-context" });
        for (const source of reply.sources)
          writer.write({ type: "source-url", ...source });
        writer.write({ type: "finish", finishReason: "stop" });
      },
    });
    return createUIMessageStreamResponse({
      stream,
      headers: {
        "Cache-Control": "no-store",
        "x-3db-ai-model": "local-deterministic-context",
        "x-3db-knowledge-environment": "local_development",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return Response.json(
        { error: "Invalid local assistant request or evidence" },
        { status: 400 },
      );
    return Response.json(
      { error: "Local knowledge unavailable or configuration invalid" },
      { status: 503 },
    );
  }
}
