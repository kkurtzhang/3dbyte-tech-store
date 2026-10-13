import {
  assembleLocalKnowledgeReply,
  getLocalKnowledgeConfig,
  retrieveLocalKnowledge,
} from "../../src/app/api/ai-shopping-assistant/local-knowledge";

const enabled = {
  NODE_ENV: "development",
  AI_ASSISTANT_LOCAL_KNOWLEDGE: "1",
};
const citation = {
  local_source_id: "local_source_test",
  source_url: "https://example.com/manufacturer",
  source_sha256: "a".repeat(64),
  environment: "local_development",
  quote: "Captured source text",
  start_char: 0,
  end_char: 20,
};
const claim = {
  claim_id: "local_claim_test",
  record_id: "local_dev_guide_N01",
  record_revision: "b".repeat(64),
  environment: "local_development",
  statement: "An evidence-scoped statement.",
  status: "editorial_inference",
  value: "An evidence-scoped statement.",
  citations: [citation],
  local_product_id: null,
  local_variant_id: null,
  source_scope: "Manufacturer-specific context.",
  explicit_unknowns: { universal_compatibility: null },
};
const fixture = {
  environment: "local_development",
  staging_native_eligible: false,
  model_calls: 0,
  neural_embeddings: false,
  status: "source_grounded_context",
  context_pack: [claim],
  generation_contract: {
    citations_required: true,
    unresolved_fields_must_remain_unknown: true,
    source_scope_must_be_preserved: true,
    staging_native_approval_claim_allowed: false,
    llm_calls_authorized: false,
  },
};

describe("opt-in local knowledge adapter", () => {
  it("is disabled by default and rejects production or non-loopback targets", () => {
    expect(getLocalKnowledgeConfig({})).toBeNull();
    expect(() =>
      getLocalKnowledgeConfig({ ...enabled, NODE_ENV: "production" }),
    ).toThrow();
    for (const url of [
      "http://192.168.1.1:8873",
      "https://staging.example.com",
      "http://user:pass@127.0.0.1:8873",
    ]) {
      expect(() =>
        getLocalKnowledgeConfig({
          ...enabled,
          AI_ASSISTANT_LOCAL_KNOWLEDGE_URL: url,
        }),
      ).toThrow();
    }
    expect(getLocalKnowledgeConfig(enabled)?.baseUrl).toBe(
      "http://127.0.0.1:8873",
    );
  });

  it("retrieves only bounded local context without credentials or redirects", async () => {
    const fetcher = jest.fn(async () => Response.json(fixture));
    const config = getLocalKnowledgeConfig(enabled)!;
    const context = await retrieveLocalKnowledge(
      "What is established?",
      config,
      fetcher,
    );
    expect(
      context.context_pack[0].explicit_unknowns.universal_compatibility,
    ).toBeNull();
    const [url, options] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("http://127.0.0.1:8873/api/search?");
    expect(options.redirect).toBe("error");
    expect(options.cache).toBe("no-store");
    expect(options.headers).toBeUndefined();
    await expect(
      retrieveLocalKnowledge("x".repeat(501), config, fetcher),
    ).rejects.toThrow();
  });

  it("rejects native identities, missing evidence and invented non-null unknowns", async () => {
    const config = getLocalKnowledgeConfig(enabled)!;
    const variants = [
      { ...fixture, environment: "staging" },
      { ...fixture, staging_native_eligible: true },
      { ...fixture, context_pack: [{ ...claim, record_id: "prod_real" }] },
      { ...fixture, context_pack: [{ ...claim, citations: [] }] },
      {
        ...fixture,
        context_pack: [
          { ...claim, status: "unknown", value: "invented", citations: [] },
        ],
      },
      {
        ...fixture,
        context_pack: [
          {
            ...claim,
            citations: [{ ...citation, source_url: "javascript:alert(1)" }],
          },
        ],
      },
    ];
    for (const value of variants) {
      await expect(
        retrieveLocalKnowledge("Question", config, async () =>
          Response.json(value),
        ),
      ).rejects.toThrow();
    }
  });

  it("cites the exact context and labels deterministic assembly", async () => {
    const context = await retrieveLocalKnowledge(
      "Question",
      getLocalKnowledgeConfig(enabled)!,
      async () => Response.json(fixture),
    );
    const reply = assembleLocalKnowledgeReply(context);
    expect(reply.text).toContain("Deterministic");
    expect(reply.text).toContain(claim.statement);
    expect(reply.text).toContain(claim.source_scope);
    expect(reply.sources[0].sourceId).toBe(citation.local_source_id);
    expect(reply.sources[0].url).toBe(citation.source_url);
  });

  it("keeps unresolved questions unknown and does not present incidental hits as an answer", async () => {
    const context = await retrieveLocalKnowledge(
      "Question",
      getLocalKnowledgeConfig(enabled)!,
      async () =>
        Response.json({
          ...fixture,
          status: "unknown",
          reason: "canonical_values_unresolved",
          unknown_fields: ["drying_temperature_c"],
        }),
    );
    const reply = assembleLocalKnowledgeReply(context);
    expect(reply.text).toContain("Unknown");
    expect(reply.text).toContain("drying_temperature_c");
    expect(reply.text).not.toContain(claim.statement);
    expect(reply.sources).toEqual([]);
  });
});

describe("local chatbot stream boundary", () => {
  const savedEnv = process.env;
  const savedFetch = global.fetch;
  afterEach(() => {
    process.env = savedEnv;
    global.fetch = savedFetch;
  });
  it("streams real AI SDK text, context and sources for loopback aliases without a provider", async () => {
    process.env = {
      NODE_ENV: "development",
      AI_ASSISTANT_LOCAL_KNOWLEDGE: "1",
    };
    global.fetch = jest.fn(async () => Response.json(fixture));
    const { handleLocalKnowledgeChat } = await import(
      "../../src/app/api/ai-shopping-assistant/local-knowledge-chat"
    );
    const response = await handleLocalKnowledgeChat(
      new Request("http://localhost:3005/api/ai-shopping-assistant", {
        method: "POST",
        headers: { Host: "127.0.0.1:3005" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              parts: [{ type: "text", text: "What is established?" }],
            },
          ],
        }),
      }),
    );
    expect(response.status).toBe(200);
    const stream = await response.text();
    expect(stream).toContain("data-local-knowledge");
    expect(stream).toContain("source-url");
    expect(stream).toContain("Deterministic");
    expect(response.headers.get("x-3db-ai-model")).toBe(
      "local-deterministic-context",
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects public hosts, production opt-in and customer identifiers before retrieval", async () => {
    process.env = {
      NODE_ENV: "development",
      AI_ASSISTANT_LOCAL_KNOWLEDGE: "1",
    };
    global.fetch = jest.fn();
    const { handleLocalKnowledgeChat } = await import(
      "../../src/app/api/ai-shopping-assistant/local-knowledge-chat"
    );
    const request = (url: string, text: string) =>
      new Request(url, {
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
      });
    expect(
      (
        await handleLocalKnowledgeChat(
          request("http://store.example.com/api", "Question"),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handleLocalKnowledgeChat(
          request(
            "http://127.0.0.1:3005/api",
            "Track my order order_fixture123",
          ),
        )
      ).status,
    ).toBe(400);
    process.env = { ...process.env, NODE_ENV: "production" };
    expect(
      (
        await handleLocalKnowledgeChat(
          request("http://127.0.0.1:3005/api", "Question"),
        )
      ).status,
    ).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("local retrieval failure behavior", () => {
  const savedEnv = process.env;
  const savedFetch = global.fetch;
  afterEach(() => {
    process.env = savedEnv;
    global.fetch = savedFetch;
  });
  it("reports an unavailable or stale local index without falling back to a model", async () => {
    process.env = {
      NODE_ENV: "development",
      AI_ASSISTANT_LOCAL_KNOWLEDGE: "1",
      DEEPSEEK_API_KEY: "unused-test-placeholder",
    };
    global.fetch = jest.fn(async () =>
      Response.json({ error: "stale index" }, { status: 400 }),
    );
    const { handleLocalKnowledgeChat } = await import(
      "../../src/app/api/ai-shopping-assistant/local-knowledge-chat"
    );
    const response = await handleLocalKnowledgeChat(
      new Request("http://127.0.0.1:3005/api", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "What is established?" }],
        }),
      }),
    );
    expect(response.status).toBe(503);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain(
      "http://127.0.0.1:8873/api/search?",
    );
  });
  it("rejects an oversized local request before retrieval", async () => {
    process.env = {
      NODE_ENV: "development",
      AI_ASSISTANT_LOCAL_KNOWLEDGE: "1",
    };
    global.fetch = jest.fn();
    const { handleLocalKnowledgeChat } = await import(
      "../../src/app/api/ai-shopping-assistant/local-knowledge-chat"
    );
    const response = await handleLocalKnowledgeChat(
      new Request("http://127.0.0.1:3005/api", {
        method: "POST",
        body: "x".repeat(64001),
      }),
    );
    expect(response.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("record-scoped context assembly", () => {
  it("excludes incidental evidence from a different record", async () => {
    const context = await retrieveLocalKnowledge(
      "Question",
      getLocalKnowledgeConfig(enabled)!,
      async () =>
        Response.json({
          ...fixture,
          context_pack: [
            claim,
            {
              ...claim,
              claim_id: "local_claim_other",
              record_id: "local_dev_guide_N04",
              statement: "Incidental unrelated adhesive advice.",
            },
          ],
        }),
    );
    const reply = assembleLocalKnowledgeReply(context);
    expect(reply.text).toContain(claim.statement);
    expect(reply.text).not.toContain("Incidental unrelated adhesive advice.");
  });
});
