import { startNodeTracingAsync } from "@3dbyte-tech-store/observability";

type NodeTracingResult = Awaited<ReturnType<typeof startNodeTracingAsync>>;

function logTracingStartup(result: NodeTracingResult) {
  console.info("[observability] storefront tracing startup", {
    enabled: result.config.enabled,
    environment: result.config.environment,
    langfuseConfigured: Boolean(result.config.langfuse),
    reason: result.reason,
    serviceName: result.config.serviceName,
    started: result.started,
    tracesEndpoint: result.config.tracesEndpoint,
  });
}

export async function registerNodeTracing() {
  const result = await startNodeTracingAsync({
    serviceName: "3dbyte-tech-store-storefront",
    serviceVersion: process.env.VERCEL_GIT_COMMIT_SHA,
  });

  logTracingStartup(result);
}
