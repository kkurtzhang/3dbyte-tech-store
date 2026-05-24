import { startNodeTracingAsync } from "@3dbyte-tech-store/observability";

export async function registerNodeTracing() {
  await startNodeTracingAsync({
    serviceName: "3dbyte-tech-store-storefront",
    serviceVersion: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}
