import { startNodeTracingAsync } from "@3dbyte-tech-store/observability";

type NodeTracingResult = Awaited<ReturnType<typeof startNodeTracingAsync>>;

function sanitizeEndpointForLog(endpoint: string | undefined) {
  if (!endpoint) return undefined;

  try {
    const url = new URL(endpoint);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";

    return url.toString();
  } catch {
    return "[configured]";
  }
}

function logTracingStartup(result: NodeTracingResult) {
  console.info("[observability] storefront tracing startup", {
    enabled: result.config.enabled,
    environment: result.config.environment,
    langfuseConfigured: Boolean(result.config.langfuse),
    reason: result.reason,
    serviceName: result.config.serviceName,
    started: result.started,
    tracesEndpoint: sanitizeEndpointForLog(result.config.tracesEndpoint),
  });
}

export async function registerNodeTracing() {
  const result = await startNodeTracingAsync({
    serviceName: "3dbyte-tech-store-storefront",
    serviceVersion: process.env.VERCEL_GIT_COMMIT_SHA,
  });

  logTracingStartup(result);
}
