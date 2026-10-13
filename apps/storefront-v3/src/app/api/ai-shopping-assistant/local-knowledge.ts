import { tool } from "ai";
import { z } from "zod";
import { catalogueGroupKeys } from "./local-catalogue-subjects";

// This contract deliberately cannot be used as an ApprovedKnowledgeDocument.
const localId = z.string().regex(/^local_dev_[a-zA-Z0-9_]+$/);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const citationSchema = z
  .object({
    local_source_id: z.string().startsWith("local_source_"),
    source_url: z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password;
      }),
    source_sha256: sha256,
    environment: z.literal("local_development"),
    quote: z.string().min(1).max(12000).optional(),
    evidence_excerpt: z.string().min(1).max(12000).optional(),
    start_char: z.number().int().nonnegative().optional(),
    end_char: z.number().int().nonnegative().optional(),
    json_pointer: z.string().optional(),
    page: z.number().int().positive().optional(),
  })
  .refine((value) => Boolean(value.quote || value.evidence_excerpt));

const claimSchema = z
  .object({
    claim_id: z.string().startsWith("local_claim_"),
    record_id: localId,
    record_revision: sha256,
    environment: z.literal("local_development"),
    statement: z.string().min(1).max(8000),
    value: z.string().nullable(),
    status: z.enum(["supported", "editorial_inference", "unknown"]),
    citations: z.array(citationSchema).max(30),
    local_product_id: localId.nullable(),
    local_variant_id: localId.nullable(),
    source_scope: z.string().min(1).max(2000),
    explicit_unknowns: z.record(z.null()),
    editorial_basis: z.record(z.unknown()).optional(),
    scope_conditions: z
      .record(z.union([z.string(), z.number(), z.null()]))
      .optional(),
  })
  .superRefine((claim, ctx) => {
    if (
      claim.status === "unknown"
        ? claim.value !== null || claim.citations.length !== 0
        : claim.citations.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid evidence or unknown claim",
      });
    }
  });

const contextSchema = z.object({
  environment: z.literal("local_development"),
  staging_native_eligible: z.literal(false),
  model_calls: z.literal(0),
  neural_embeddings: z.literal(false),
  status: z.enum([
    "source_grounded_context",
    "evidence_only",
    "unknown",
    "limited",
  ]),
  reason: z.string().optional(),
  answer: z.string().nullable().optional(),
  context_pack: z.array(claimSchema).max(5),
  unknown_fields: z.array(z.string()).optional(),
  unresolved_group_fields: z
    .array(
      z.object({
        record_id: localId,
        field: z.string(),
        value: z.null(),
        status: z.literal("unknown"),
      }),
    )
    .optional(),
  rating_citations: z.array(citationSchema).optional(),
  generation_contract: z.object({
    citations_required: z.literal(true),
    unresolved_fields_must_remain_unknown: z.literal(true),
    source_scope_must_be_preserved: z.literal(true),
    staging_native_approval_claim_allowed: z.literal(false),
    llm_calls_authorized: z.literal(false),
  }),
});
export type LocalKnowledgeContext = z.infer<typeof contextSchema>;
export type LocalKnowledgeConfig = { baseUrl: string };
type LocalSource = { sourceId: string; url: string; title: string };

export function getLocalKnowledgeConfig(
  env: Record<string, string | undefined> = process.env,
): LocalKnowledgeConfig | null {
  if (env.AI_ASSISTANT_LOCAL_KNOWLEDGE !== "1") return null;
  if (env.NODE_ENV !== "development")
    throw new Error("Local knowledge requires development mode");
  const url = new URL(
    env.AI_ASSISTANT_LOCAL_KNOWLEDGE_URL || "http://127.0.0.1:8873",
  );
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("Local knowledge requires a literal loopback HTTP origin");
  }
  return { baseUrl: url.origin };
}

export async function readBoundedBody(
  response: Pick<Response, "body">,
  limit: number,
): Promise<string> {
  if (!response.body) throw new Error("Missing response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) return text + decoder.decode();
      bytes += result.value.byteLength;
      if (bytes > limit) throw new Error("Local payload limit exceeded");
      text += decoder.decode(result.value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function retrieveLocalKnowledge(
  question: string,
  config: LocalKnowledgeConfig,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
  groupKey?: string,
): Promise<LocalKnowledgeContext> {
  const query = z.string().trim().min(1).max(500).parse(question);
  // Revalidate even a caller-created configuration before any network operation.
  const checked = getLocalKnowledgeConfig({
    NODE_ENV: "development",
    AI_ASSISTANT_LOCAL_KNOWLEDGE: "1",
    AI_ASSISTANT_LOCAL_KNOWLEDGE_URL: config.baseUrl,
  })!;
  const url = new URL("/api/search", checked.baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("mode", "hybrid");
  if (groupKey)
    url.searchParams.set(
      "group",
      z
        .enum(catalogueGroupKeys)
        .parse(groupKey),
    );
  const response = await fetcher(url.toString(), {
    cache: "no-store",
    redirect: "error",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
      : AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Local knowledge unavailable");
  return contextSchema.parse(
    JSON.parse(await readBoundedBody(response, 300000)),
  );
}

export function createLocalKnowledgeTool(
  config: LocalKnowledgeConfig,
  signal?: AbortSignal,
) {
  const inputSchema = z.object({
    question: z.string().trim().min(1).max(500),
    groupKey: z
      .enum(catalogueGroupKeys)
      .optional(),
  });
  const execute = (input: z.infer<typeof inputSchema>) => {
    const parsed = inputSchema.parse(input);
    return retrieveLocalKnowledge(
      parsed.question,
      config,
      fetch,
      signal,
      parsed.groupKey,
    );
  };
  return {
    execute,
    definition: tool({
      description:
        "Retrieve cited, scope-limited local development knowledge. Reference grouping does not resolve physical variants. Preserve unknowns and source scope.",
      inputSchema,
      execute,
    }),
  };
}

export function localClarificationContext(
  reason: string,
  subjects: string[],
): LocalKnowledgeContext {
  return {
    environment: "local_development",
    staging_native_eligible: false,
    model_calls: 0,
    neural_embeddings: false,
    status: "unknown",
    reason,
    answer: subjects.length
      ? "Which item or material do you mean: " +
        subjects.join(" or ") +
        "? Name the item and variant in the question."
      : "Which item or material does the follow-up refer to? Name the item and variant in the question.",
    context_pack: [],
    unknown_fields: ["conversation_subject"],
    generation_contract: {
      citations_required: true,
      unresolved_fields_must_remain_unknown: true,
      source_scope_must_be_preserved: true,
      staging_native_approval_claim_allowed: false,
      llm_calls_authorized: false,
    },
  };
}

export function assembleLocalKnowledgeReply(context: LocalKnowledgeContext): {
  text: string;
  sources: LocalSource[];
  claimIds: string[];
} {
  const prefix =
    "Local development · Deterministic source context · No language model generation\n\n";
  if (context.status === "unknown" || context.status === "evidence_only") {
    return {
      text:
        prefix +
        "Unknown: " +
        (context.answer ||
          "The requested setting or compatibility is unresolved in the captured sources.") +
        (context.unknown_fields?.length
          ? "\nUnresolved fields: " + context.unknown_fields.join(", ")
          : ""),
      sources: [],
      claimIds: [],
    };
  }
  const verified = context.context_pack.filter(
    (claim) => claim.status !== "unknown",
  );
  const leadingRecord = verified[0]?.record_id;
  const claims = verified
    .filter((claim) => claim.record_id === leadingRecord)
    .slice(0, 3);
  const evidence =
    context.status === "limited"
      ? context.rating_citations || []
      : claims.flatMap((claim) => claim.citations);
  if (!evidence.length)
    throw new Error("Cannot assemble uncited source context");
  const sources = Array.from(
    new Map(
      evidence.map((citation) => [
        citation.local_source_id,
        {
          sourceId: citation.local_source_id,
          url: citation.source_url,
          title: new URL(citation.source_url).hostname,
        },
      ]),
    ).values(),
  );
  const text =
    context.status === "limited"
      ? context.answer || "Requested use exceeds the captured source scope."
      : claims
          .map(
            (claim, index) =>
              String(index + 1) +
              ". " +
              claim.statement +
              "\nScope: " +
              claim.source_scope +
              (Object.keys(claim.explicit_unknowns).length
                ? "\nUnresolved: " +
                  Object.keys(claim.explicit_unknowns).join(", ")
                : ""),
          )
          .join("\n\n");
  return {
    text: prefix + text,
    sources,
    claimIds:
      context.status === "limited" ? [] : claims.map((claim) => claim.claim_id),
  };
}
