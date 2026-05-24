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

Set `OTEL_TRACING_ENABLED=false` or `OTEL_SDK_DISABLED=true` to disable tracing for a runtime.
