# Observability Tracing

The project emits server-side OpenTelemetry traces from Medusa, Strapi, and the Next.js storefront when tracing env vars are present. The storefront AI shopping assistant also enables Vercel AI SDK telemetry so model/tool spans can flow to Langfuse.

## Ingest Endpoints

Use the private observation endpoint over Tailscale for SDK traffic. Keep the real host or IP in runtime secrets only.

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://<observability-tailnet-host-or-ip>:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
LANGFUSE_HOST=http://<observability-tailnet-host-or-ip>:3000
```

For explicit trace endpoint configuration:

```env
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://<observability-tailnet-host-or-ip>:4318/v1/traces
```

For OTLP gRPC:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://<observability-tailnet-host-or-ip>:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

Do not point SDK or API traffic at `https://observe.3dbytetech.com.au` or `https://insights.3dbytetech.com.au`. Those are human dashboard URLs behind Cloudflare Access. The shared observability helper rejects those hostnames for ingest.

## Langfuse Keys

Set these only in app runtime secrets:

```env
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
```

Retrieve the project keys on the observation server without printing or committing them:

```bash
ssh <observation-ssh-alias> 'grep -E "LANGFUSE_INIT_PROJECT_PUBLIC_KEY|LANGFUSE_INIT_PROJECT_SECRET_KEY" <langfuse-env-path>'
```

Map the printed init key names into the app runtime names above.

## App Hooks

- Medusa uses `apps/backend/instrumentation.ts` and Medusa's `registerOtel`.
- Strapi starts Node auto-instrumentation from `apps/cms/src/index.ts`.
- Next.js loads Node-only tracing through `apps/storefront-v3/instrumentation.ts` and `instrumentation.node.ts`.
- AI model/tool spans are enabled in `apps/storefront-v3/src/app/api/ai-shopping-assistant/route.ts` when OTLP or Langfuse env is configured.

## Storefront Assistant Traces

The storefront AI drawer sends a browser-tab chat session id with every assistant request. Langfuse should show:

- trace name: `storefront.ai-shopping-assistant`;
- session id: one browser chat conversation;
- tags: `ai-chatbot`, `storefront`, `shopping-assistant`, `storefront.shopping-assistant`;
- metadata: `chatbot_id`, `chatbot_surface`, `service`, `route`, `provider`, `model`, `temperature`, and `release_sha`;
- input: a sanitized debug object with the latest user message, message count, prompt name, and prompt label;
- output: a sanitized debug object with the final assistant text and finish reason.

Trace input/output is written through `@langfuse/tracing` in an active request observation. The route keeps that observation open until the AI stream finishes so the final assistant output can be attached to the top-level trace. The values deliberately mask emails, order/support references, and common commerce IDs before writing to Langfuse. Keep full customer transcripts in application data only when the customer has explicitly consented.

Customer assistant eval runs use an internal request marker so the route can return the active Langfuse trace id to the eval runner. Marked eval responses also return diagnostic headers for model, temperature, prompt version, code-owned guardrail version, and release SHA. Repeated consistency runs fail when those diagnostics are missing or change between attempts. Deterministic eval score publishing should target `traceId` when it is available, with `sessionId` as a fallback only when the trace id is unavailable. Multi-turn evals publish aggregate case scores to the session because their evidence spans more than one trace. Normal browser chat responses do not expose trace or diagnostic headers.

The eval runner always publishes `deterministic_pass`, `grounding_cue_match`, `format_warning_count`, and `forbidden_claim_count`. Cases can also publish evidence-backed boolean scores for exact product links, tool-call correctness, safe support handoff, order privacy, and synthetic PII leakage. It intentionally leaves `grounded_answer`, human helpfulness/actionability, and reviewer notes unset until source evidence or a human reviewer supplies them.

DeepSeek streaming requests include `stream_options.include_usage=true` so the final provider usage chunk can report cache-aware token counts. Configure the Langfuse `deepseek-v4-flash` model pricing with these usage detail keys:

```text
input_cache_hit_tokens
input_cache_miss_tokens
output
```

The assistant route records usage details with those keys when the stream finishes. If provider-specific cache fields are unavailable, input tokens are conservatively treated as cache misses.

Set `AI_ASSISTANT_TEMPERATURE` from `0` to `2` to control DeepSeek sampling. The default is `0.2`, which keeps customer smoke evals more stable while preserving natural wording. The storefront `/api/health` response returns `releaseSha` from `STOREFRONT_RELEASE_SHA`; in Coolify compose this is wired from the runtime `SOURCE_COMMIT` value so post-deploy evals can wait for the expected commit without reducing Docker build cache reuse.

Set `OTEL_TRACING_ENABLED=false` or `OTEL_SDK_DISABLED=true` to disable tracing for a runtime.
