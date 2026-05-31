import { trace, type Span } from "@opentelemetry/api";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

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

function setJsonAttribute(span: Span, name: string, value: unknown) {
  if (!span) {
    return false;
  }

  span.setAttribute(name, JSON.stringify(value));
  return true;
}

function setLangfuseTraceAttributes(
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
  }

  if (attributes.output !== undefined) {
    setJsonAttribute(span, "langfuse.trace.output", attributes.output);
  }

  if (attributes.model) {
    span.setAttribute("langfuse.observation.model.name", attributes.model);
    span.setAttribute("langfuse.observation.type", "generation");
  }

  if (attributes.usageDetails) {
    setJsonAttribute(
      span,
      "langfuse.observation.usage_details",
      compactNumberRecord(attributes.usageDetails),
    );
  }

  if (attributes.costDetails) {
    setJsonAttribute(
      span,
      "langfuse.observation.cost_details",
      compactNumberRecord(attributes.costDetails),
    );
  }

  return true;
}

export function createActiveLangfuseTraceAttributeWriter() {
  const fallbackSpan = trace.getActiveSpan();

  return (attributes: LangfuseTraceAttributeInput) =>
    setLangfuseTraceAttributes(
      trace.getActiveSpan() ?? fallbackSpan,
      attributes,
    );
}

export function setActiveLangfuseTraceAttributes(
  attributes: LangfuseTraceAttributeInput,
) {
  return setLangfuseTraceAttributes(trace.getActiveSpan(), attributes);
}
