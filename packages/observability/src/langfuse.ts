import {
  getActiveTraceId,
  propagateAttributes,
  setActiveTraceIO,
  startActiveObservation,
  type LangfuseSpan,
} from "@langfuse/tracing";
import { trace, type Span } from "@opentelemetry/api";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
const EMPTY_TRACE_ID = "00000000000000000000000000000000";

export type LangfuseTraceAttributeInput = {
  costDetails?: Record<string, number | undefined>;
  input?: JsonValue;
  metadata?: Record<string, JsonValue | undefined>;
  model?: string;
  name?: string;
  output?: JsonValue;
  sessionId?: string;
  tags?: string[];
  usageDetails?: Record<string, number | undefined>;
  userId?: string;
};

export type LangfuseTracePropagationInput = Pick<
  LangfuseTraceAttributeInput,
  "metadata" | "name" | "sessionId" | "tags" | "userId"
>;

export type LangfuseTraceObservation = Pick<
  LangfuseSpan,
  "end" | "traceId"
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

function setJsonAttribute(span: Span, name: string, value: unknown) {
  if (!span) {
    return false;
  }

  span.setAttribute(name, JSON.stringify(value));
  return true;
}

function setLangfuseTopLevelTraceAttributes(
  span: Span | undefined,
  attributes: LangfuseTraceAttributeInput,
) {
  if (!span) {
    return false;
  }

  if (attributes.name) {
    span.setAttribute("langfuse.trace.name", attributes.name);
  }

  if (attributes.userId) {
    span.setAttribute("user.id", attributes.userId);
    span.setAttribute("langfuse.user.id", attributes.userId);
  }

  if (attributes.sessionId) {
    span.setAttribute("session.id", attributes.sessionId);
    span.setAttribute("langfuse.session.id", attributes.sessionId);
  }

  if (attributes.tags?.length) {
    span.setAttribute("langfuse.trace.tags", attributes.tags);
  }

  if (attributes.metadata) {
    setJsonAttribute(
      span,
      "langfuse.trace.metadata",
      compactMetadata(attributes.metadata),
    );
  }

  if (attributes.input !== undefined) {
    setJsonAttribute(span, "langfuse.trace.input", attributes.input);
    setActiveTraceIO({ input: attributes.input });
  }

  if (attributes.output !== undefined) {
    setJsonAttribute(span, "langfuse.trace.output", attributes.output);
    setActiveTraceIO({ output: attributes.output });
  }

  return true;
}

function setLangfuseObservationAttributes(
  span: Span | undefined,
  attributes: LangfuseTraceAttributeInput,
) {
  if (!span) {
    return false;
  }

  let wroteAttributes = false;

  if (attributes.model) {
    span.setAttribute("langfuse.observation.model.name", attributes.model);
    span.setAttribute("langfuse.observation.type", "generation");
    wroteAttributes = true;
  }

  if (attributes.usageDetails) {
    wroteAttributes =
      setJsonAttribute(
        span,
        "langfuse.observation.usage_details",
        compactNumberRecord(attributes.usageDetails),
      ) || wroteAttributes;
  }

  if (attributes.costDetails) {
    wroteAttributes =
      setJsonAttribute(
        span,
        "langfuse.observation.cost_details",
        compactNumberRecord(attributes.costDetails),
      ) || wroteAttributes;
  }

  return wroteAttributes;
}

function setLangfuseTraceAttributes(
  span: Span | undefined,
  attributes: LangfuseTraceAttributeInput,
) {
  const wroteTraceAttributes = setLangfuseTopLevelTraceAttributes(
    span,
    attributes,
  );
  const wroteObservationAttributes = setLangfuseObservationAttributes(
    span,
    attributes,
  );

  return wroteTraceAttributes || wroteObservationAttributes;
}

export function createActiveLangfuseTraceAttributeWriter() {
  const fallbackSpan = trace.getActiveSpan();

  return (attributes: LangfuseTraceAttributeInput) => {
    const activeSpan = trace.getActiveSpan();
    const wroteTraceAttributes = setLangfuseTopLevelTraceAttributes(
      fallbackSpan ?? activeSpan,
      attributes,
    );
    const wroteObservationAttributes = setLangfuseObservationAttributes(
      activeSpan ?? fallbackSpan,
      attributes,
    );

    return wroteTraceAttributes || wroteObservationAttributes;
  };
}

export function setActiveLangfuseTraceAttributes(
  attributes: LangfuseTraceAttributeInput,
) {
  return setLangfuseTraceAttributes(trace.getActiveSpan(), attributes);
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
