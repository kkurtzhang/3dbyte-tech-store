import { registerOtel } from "@medusajs/medusa";

import {
  createOtelResource,
  createTraceExporter,
  resolveTracingConfig,
} from "@3dbyte-tech-store/observability";

export function register() {
  const config = resolveTracingConfig({
    serviceName: "3dbyte-tech-store-backend",
  });

  const exporter = createTraceExporter(config);

  if (!config.enabled || !exporter) {
    return;
  }

  registerOtel({
    serviceName: config.serviceName,
    exporter,
    resource: createOtelResource(config),
    instrument: {
      cache: true,
      db: true,
      http: true,
      query: true,
      workflows: true,
    },
  });
}
