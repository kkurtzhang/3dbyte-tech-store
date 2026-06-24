export const DEFAULT_ASSISTANT_PROMPT_NAME =
  "storefront.ai-shopping-assistant.system";

const DEFAULT_STORE_NAME = "3D Byte Tech";

const DASHBOARD_EDITABLE_ASSISTANT_PROMPT = [
  "You are the 3D Byte Tech shopping assistant.",
  "Start product advice with a short recommendation, then explain why using grounded facts.",
  "Use clear sections when useful: Recommendation, Why, Products to compare, Caveats, Next question.",
  "Ask one focused follow-up question when compatibility details are missing; avoid long checklists unless the customer asks.",
  "Keep answers concise and mention uncertainty when context is incomplete.",
].join(" ");

// Increment whenever the code-owned guardrail contract changes.
export const CODE_OWNED_ASSISTANT_GUARDRAILS_VERSION = "2026-06-24.1";

export const CODE_OWNED_ASSISTANT_GUARDRAILS = [
  "Use only provided product, search, Strapi, Medusa, order, tracking, shipping, and support-ticket context.",
  "You are suggest-only for shopping: recommend product cards, links, and next steps the customer clicks themselves.",
  "When recommending a product, use the provided productUrl as the product link. Never use image or thumbnail URLs as product links.",
  "Copy productUrl values exactly, character for character. If a product has no productUrl, mention the product name or handle without a markdown link.",
  "Product guidance may include expertContext and per-product expertSignals. Treat them as grounded expert routing advice, not as permission to invent missing facts.",
  "Use print_process for material, nozzle, temperature, drying, enclosure, and build-surface advice.",
  "Use rc_model_building for 3DSets-style RC electronics, hardware, voltage, connector, battery, bearing, fastener, and printed component advice.",
  "Use compatibility_triage when a fit/compatibility answer needs missing printer, project, variant, voltage, connector, or use-case details.",
  "Use support_handoff only to suggest a human ticket path; ticket creation still requires explicit customer confirmation and required contact fields.",
  "Never place orders, modify carts, add items, refund, cancel, or mutate customer data.",
  "For order or tracking help, require the customer to provide both order reference and email proof.",
  "You may create a support ticket only after explicit customer confirmation and after collecting name, email, subject, and message.",
  "Do not include transcript excerpts in a ticket unless the customer explicitly consents.",
  'For order, tracking, support, and account-related replies, do not repeat customer email addresses, order references, tracking numbers, addresses, or payment details in the final answer. Refer to them generically, such as "the email you provided" or "your order reference".',
];

type PromptManagementEnvKey =
  | "APP_ENV"
  | "LANGFUSE_ASSISTANT_PROMPT_LABEL"
  | "LANGFUSE_ASSISTANT_PROMPT_NAME"
  | "LANGFUSE_HOST"
  | "LANGFUSE_PUBLIC_KEY"
  | "LANGFUSE_SECRET_KEY"
  | "NODE_ENV";

type PromptManagementEnv = Partial<
  Record<PromptManagementEnvKey, string | undefined>
>;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type AssistantPromptMetadata = Record<string, JsonValue | undefined>;

export type LangfuseTextPrompt = {
  compile?: (variables?: Record<string, string>) => unknown;
  name?: string;
  prompt?: unknown;
  toJSON?: () => unknown;
  version?: number;
};

export type LangfusePromptClient = {
  prompt: {
    get: (
      name: string,
      options?: {
        label?: string;
      },
    ) => Promise<LangfuseTextPrompt>;
  };
};

export type AssistantSystemPromptResult = {
  metadata: AssistantPromptMetadata;
  prompt: string;
  source: "code_fallback" | "langfuse";
};

let cachedLangfusePromptClient: LangfusePromptClient | undefined;

function getEnvString(
  env: PromptManagementEnv,
  key: keyof PromptManagementEnv,
) {
  const value = env[key]?.trim();

  return value ? value : undefined;
}

function buildFallbackPrompt() {
  return [
    DASHBOARD_EDITABLE_ASSISTANT_PROMPT,
    ...CODE_OWNED_ASSISTANT_GUARDRAILS,
  ].join(" ");
}

function appendCodeOwnedGuardrails(prompt: string) {
  return [prompt.trim(), ...CODE_OWNED_ASSISTANT_GUARDRAILS].join(" ");
}

function getPromptName(env: PromptManagementEnv) {
  return (
    getEnvString(env, "LANGFUSE_ASSISTANT_PROMPT_NAME") ??
    DEFAULT_ASSISTANT_PROMPT_NAME
  );
}

function hasLangfuseCredentials(env: PromptManagementEnv) {
  return Boolean(
    getEnvString(env, "LANGFUSE_PUBLIC_KEY") &&
      getEnvString(env, "LANGFUSE_SECRET_KEY"),
  );
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map(toJsonValue)
      .filter((item): item is JsonValue => item !== undefined);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, toJsonValue(item)] as const)
        .filter(
          (entry): entry is [string, JsonValue] => entry[1] !== undefined,
        ),
    );
  }

  return undefined;
}

function buildPromptMetadata({
  error,
  label,
  langfusePrompt,
  name,
  source,
  version,
}: {
  error?: unknown;
  label: string;
  langfusePrompt?: LangfuseTextPrompt;
  name: string;
  source: AssistantSystemPromptResult["source"];
  version?: number;
}): AssistantPromptMetadata {
  const promptJson = langfusePrompt?.toJSON?.();
  const errorMessage = error instanceof Error ? error.message : undefined;

  return {
    code_guardrails_version: CODE_OWNED_ASSISTANT_GUARDRAILS_VERSION,
    langfusePrompt: toJsonValue(promptJson),
    langfuse_prompt_error: errorMessage,
    langfuse_prompt_label: label,
    langfuse_prompt_name: name,
    langfuse_prompt_source: source,
    langfuse_prompt_version: version,
  };
}

function toPromptText(
  prompt: LangfuseTextPrompt,
  variables: Record<string, string>,
) {
  const compiled = prompt.compile?.(variables);

  if (typeof compiled === "string" && compiled.trim()) {
    return compiled;
  }

  return typeof prompt.prompt === "string" && prompt.prompt.trim()
    ? prompt.prompt
    : undefined;
}

export function resolveLangfusePromptLabel(env: PromptManagementEnv) {
  const explicitLabel = getEnvString(env, "LANGFUSE_ASSISTANT_PROMPT_LABEL");

  if (explicitLabel) {
    return explicitLabel;
  }

  const appEnv = getEnvString(env, "APP_ENV");

  if (appEnv === "staging" || appEnv === "production") {
    return appEnv;
  }

  return "production";
}

export async function createLangfusePromptClient(
  env: PromptManagementEnv = process.env,
): Promise<LangfusePromptClient | undefined> {
  const publicKey = getEnvString(env, "LANGFUSE_PUBLIC_KEY");
  const secretKey = getEnvString(env, "LANGFUSE_SECRET_KEY");

  if (!publicKey || !secretKey) {
    return undefined;
  }

  if (cachedLangfusePromptClient) {
    return cachedLangfusePromptClient;
  }

  const { LangfuseClient } = await import("@langfuse/client");

  cachedLangfusePromptClient = new LangfuseClient({
    baseUrl: getEnvString(env, "LANGFUSE_HOST"),
    publicKey,
    secretKey,
  });

  return cachedLangfusePromptClient;
}

export async function resolveAssistantSystemPrompt({
  env = process.env,
  langfuseClient,
}: {
  env?: PromptManagementEnv;
  langfuseClient?: LangfusePromptClient;
} = {}): Promise<AssistantSystemPromptResult> {
  const label = resolveLangfusePromptLabel(env);
  const name = getPromptName(env);
  const variables = {
    promptLabel: label,
    promptName: name,
    storeName: DEFAULT_STORE_NAME,
  };

  if (!langfuseClient && !hasLangfuseCredentials(env)) {
    return {
      metadata: buildPromptMetadata({ label, name, source: "code_fallback" }),
      prompt: buildFallbackPrompt(),
      source: "code_fallback",
    };
  }

  try {
    const client = langfuseClient ?? (await createLangfusePromptClient(env));
    const prompt = await client?.prompt.get(name, { label });
    const promptText = prompt ? toPromptText(prompt, variables) : undefined;

    if (!prompt || !promptText) {
      return {
        metadata: buildPromptMetadata({ label, name, source: "code_fallback" }),
        prompt: buildFallbackPrompt(),
        source: "code_fallback",
      };
    }

    return {
      metadata: buildPromptMetadata({
        label,
        langfusePrompt: prompt,
        name,
        source: "langfuse",
        version: prompt.version,
      }),
      prompt: appendCodeOwnedGuardrails(promptText),
      source: "langfuse",
    };
  } catch (error) {
    return {
      metadata: buildPromptMetadata({
        error,
        label,
        name,
        source: "code_fallback",
      }),
      prompt: buildFallbackPrompt(),
      source: "code_fallback",
    };
  }
}
