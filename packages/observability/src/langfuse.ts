import {
  getActiveTraceId,
  propagateAttributes,
  setActiveTraceIO,
  startActiveObservation,
  updateActiveObservation,
  type LangfuseGenerationAttributes,
  type LangfuseSpan,
  type ObservationLevel,
} from "@langfuse/tracing";
import { trace } from "@opentelemetry/api";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
const EMPTY_TRACE_ID = "00000000000000000000000000000000";

export type LangfuseGenerationUpdateInput = {
  costDetails?: Record<string, number | undefined>;
  input?: JsonValue;
  level?: ObservationLevel;
  metadata?: Record<string, JsonValue | undefined>;
  model?: string;
  output?: JsonValue;
  statusMessage?: string;
  usageDetails?: Record<string, number | undefined>;
};

export type LangfuseTracePropagationInput = {
  metadata?: Record<string, JsonValue | undefined>;
  name?: string;
  sessionId?: string;
  tags?: string[];
  userId?: string;
};

export type LangfuseTraceIOUpdateInput = {
  input?: JsonValue;
  output?: JsonValue;
};

export type LangfuseTraceObservation = Pick<
  LangfuseSpan,
  "end" | "traceId" | "update"
>;

function compactNumberRecord(record: Record<string, number | undefined>) {
  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}

function compactMetadata(record: Record<string, JsonValue | undefined>) {
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, JsonValue] => {
      return entry[1] !== undefined;
    }),
  );
}

function compactStringMetadata(record: Record<string, JsonValue | undefined>) {
  return Object.fromEntries(
    Object.entries(record).flatMap(([key, value]) => {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return [[key, String(value)]];
      }

      return [];
    }),
  );
}

export function updateActiveLangfuseGeneration(
  attributes: LangfuseGenerationUpdateInput,
) {
  const generationAttributes: LangfuseGenerationAttributes = {
    ...(attributes.costDetails
      ? { costDetails: compactNumberRecord(attributes.costDetails) }
      : {}),
    ...(attributes.input !== undefined ? { input: attributes.input } : {}),
    ...(attributes.level ? { level: attributes.level } : {}),
    ...(attributes.metadata
      ? { metadata: compactMetadata(attributes.metadata) }
      : {}),
    ...(attributes.model ? { model: attributes.model } : {}),
    ...(attributes.output !== undefined ? { output: attributes.output } : {}),
    ...(attributes.statusMessage
      ? { statusMessage: attributes.statusMessage }
      : {}),
    ...(attributes.usageDetails
      ? { usageDetails: compactNumberRecord(attributes.usageDetails) }
      : {}),
  };

  updateActiveObservation(generationAttributes, { asType: "generation" });
}

export function updateActiveLangfuseTraceIO(
  attributes: LangfuseTraceIOUpdateInput,
) {
  const traceAttributes = {
    ...(attributes.input !== undefined ? { input: attributes.input } : {}),
    ...(attributes.output !== undefined ? { output: attributes.output } : {}),
  };

  if (Object.keys(traceAttributes).length > 0) {
    setActiveTraceIO(traceAttributes);
  }
}

export function propagateActiveLangfuseTraceAttributes<T>(
  attributes: LangfuseTracePropagationInput,
  fn: () => T,
) {
  return propagateAttributes(
    {
      ...(attributes.metadata
        ? { metadata: compactStringMetadata(attributes.metadata) }
        : {}),
      ...(attributes.sessionId ? { sessionId: attributes.sessionId } : {}),
      ...(attributes.tags?.length ? { tags: attributes.tags } : {}),
      ...(attributes.name ? { traceName: attributes.name } : {}),
      ...(attributes.userId ? { userId: attributes.userId } : {}),
    },
    fn,
  );
}

export function startActiveLangfuseTraceObservation<T>(
  name: string,
  fn: (observation: LangfuseTraceObservation) => T,
) {
  return startActiveObservation(name, fn, {
    asType: "span",
    endOnExit: false,
  });
}

export function getActiveLangfuseTraceId() {
  const traceId =
    getActiveTraceId() ?? trace.getActiveSpan()?.spanContext().traceId;

  return traceId && traceId !== EMPTY_TRACE_ID ? traceId : undefined;
}
