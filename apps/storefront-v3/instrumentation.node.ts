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
  if (
    process.env.APP_ENV === "staging" &&
    process.env.NODE_ENV === "production"
  ) {
    const { registerCompositionPilotOperator } = await import(
      "./src/app/api/ai-shopping-assistant/pilot-operator"
    );
    try {
      await registerCompositionPilotOperator({
        tracingReady: result.started && Boolean(result.config.langfuse),
        run: async (request, io) => {
          const { runStagingCompositionPilot } = await import(
            "./src/app/api/ai-shopping-assistant/pilot-runtime"
          );
          return runStagingCompositionPilot(request, io);
        },
      });
    } catch {
      console.warn(
        "[composition-pilot] Local operator unavailable; ordinary storefront remains active.",
      );
    }
  }
}
