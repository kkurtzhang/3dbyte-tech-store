import {
  CODE_OWNED_ASSISTANT_GUARDRAILS_VERSION,
  DEFAULT_ASSISTANT_PROMPT_NAME,
  resolveAssistantSystemPrompt,
  resolveLangfusePromptLabel,
} from "../prompt-management"

describe("assistant prompt management", () => {
  it("uses code-owned fallback prompt and guardrails when Langfuse is not configured", async () => {
    const result = await resolveAssistantSystemPrompt({
      env: {},
    })

    expect(result.source).toBe("code_fallback")
    expect(result.prompt).toContain("You are the 3D Byte Tech shopping assistant.")
    expect(result.prompt).toContain("Never place orders, modify carts")
    expect(result.prompt).toContain(
      "do not repeat customer email addresses, order references",
    )
    expect(result.metadata).toEqual(
      expect.objectContaining({
        code_guardrails_version: CODE_OWNED_ASSISTANT_GUARDRAILS_VERSION,
        langfuse_prompt_label: "production",
        langfuse_prompt_name: DEFAULT_ASSISTANT_PROMPT_NAME,
        langfuse_prompt_source: "code_fallback",
      }),
    )
  })

  it("resolves the prompt label from explicit env before app environment", () => {
    expect(
      resolveLangfusePromptLabel({
        APP_ENV: "staging",
        LANGFUSE_ASSISTANT_PROMPT_LABEL: "production",
      }),
    ).toBe("production")
    expect(resolveLangfusePromptLabel({ APP_ENV: "staging" })).toBe("staging")
    expect(resolveLangfusePromptLabel({ APP_ENV: "review" })).toBe(
      "production",
    )
  })

  it("fetches and compiles a Langfuse prompt by name and label", async () => {
    const getPrompt = jest.fn(async () => ({
      compile: (variables: Record<string, string> = {}) =>
        `Dashboard prompt for ${variables.storeName} on ${variables.promptLabel}.`,
      name: DEFAULT_ASSISTANT_PROMPT_NAME,
      toJSON: () => ({
        name: DEFAULT_ASSISTANT_PROMPT_NAME,
        version: 7,
      }),
      version: 7,
    }))

    const result = await resolveAssistantSystemPrompt({
      env: {
        APP_ENV: "staging",
        LANGFUSE_PUBLIC_KEY: "pk-test",
        LANGFUSE_SECRET_KEY: "sk-test",
      },
      langfuseClient: {
        prompt: {
          get: getPrompt,
        },
      },
    })

    expect(getPrompt).toHaveBeenCalledWith(DEFAULT_ASSISTANT_PROMPT_NAME, {
      label: "staging",
    })
    expect(result.source).toBe("langfuse")
    expect(result.prompt).toContain("Dashboard prompt for 3D Byte Tech")
    expect(result.prompt).toContain("Never place orders, modify carts")
    expect(result.metadata).toEqual(
      expect.objectContaining({
        code_guardrails_version: CODE_OWNED_ASSISTANT_GUARDRAILS_VERSION,
        langfusePrompt: {
          name: DEFAULT_ASSISTANT_PROMPT_NAME,
          version: 7,
        },
        langfuse_prompt_label: "staging",
        langfuse_prompt_name: DEFAULT_ASSISTANT_PROMPT_NAME,
        langfuse_prompt_source: "langfuse",
        langfuse_prompt_version: 7,
      }),
    )
  })

  it("falls back safely when Langfuse prompt retrieval fails", async () => {
    const result = await resolveAssistantSystemPrompt({
      env: {
        LANGFUSE_PUBLIC_KEY: "pk-test",
        LANGFUSE_SECRET_KEY: "sk-test",
      },
      langfuseClient: {
        prompt: {
          get: jest.fn(async () => {
            throw new Error("Langfuse unavailable")
          }),
        },
      },
    })

    expect(result.source).toBe("code_fallback")
    expect(result.prompt).toContain("You are the 3D Byte Tech shopping assistant.")
    expect(result.metadata.langfuse_prompt_error).toBe("Langfuse unavailable")
  })
})

it("keeps knowledge citation, variant and current-commerce boundaries code-owned", async () => {
  const { CODE_OWNED_ASSISTANT_GUARDRAILS } = await import("../prompt-management");
  const guardrails = CODE_OWNED_ASSISTANT_GUARDRAILS.join(" ");
  expect(guardrails).toContain("searchKnowledge");
  expect(guardrails).toContain("revision_hash");
  expect(guardrails).toContain("variant_id");
  expect(guardrails).toContain("binding_scope");
  expect(guardrails).toContain("variant_id=null");
  expect(guardrails).toContain("does not require purchase, batch or received-stock proof");
  expect(guardrails).toContain("Never apply variant-scoped facts to a sibling variant");
  expect(guardrails).toContain("current prices and stock");
  expect(guardrails).toContain("untrusted evidence");
});
