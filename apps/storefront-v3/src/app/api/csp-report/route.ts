const MAX_REPORT_BYTES = 10_240;
const MAX_LOGGED_REPORTS = 3;

type CspReport = {
  "blocked-uri"?: unknown;
  "document-uri"?: unknown;
  "effective-directive"?: unknown;
  "line-number"?: unknown;
  "source-file"?: unknown;
  "violated-directive"?: unknown;
};

function sanitizeDocumentUri(value: unknown) {
  if (typeof value !== "string") return undefined;

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.slice(0, 160);
  }
}

function sanitizeBlockedUri(value: unknown) {
  if (typeof value !== "string") return undefined;

  if (["data", "eval", "inline", "self"].includes(value)) {
    return value;
  }

  try {
    return new URL(value).origin;
  } catch {
    return value.slice(0, 160);
  }
}

function sanitizeDirective(value: unknown) {
  return typeof value === "string" ? value.slice(0, 120) : undefined;
}

function sanitizeLineNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function extractReports(payload: unknown): CspReport[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => extractReports(item));
  }

  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const report = record["csp-report"] ?? record.body ?? record;

  return report && typeof report === "object" ? [report as CspReport] : [];
}

function logReport(report: CspReport) {
  const summary = {
    documentUri: sanitizeDocumentUri(report["document-uri"]),
    violatedDirective: sanitizeDirective(
      report["violated-directive"] ?? report["effective-directive"]
    ),
    blockedUri: sanitizeBlockedUri(report["blocked-uri"]),
    sourceFile: sanitizeDocumentUri(report["source-file"]),
    lineNumber: sanitizeLineNumber(report["line-number"]),
  };

  if (
    summary.documentUri ||
    summary.violatedDirective ||
    summary.blockedUri ||
    summary.sourceFile
  ) {
    console.warn("CSP report-only violation", summary);
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (contentLength > MAX_REPORT_BYTES) {
    return new Response(null, { status: 413 });
  }

  const body = await request.text();

  if (body.length > MAX_REPORT_BYTES) {
    return new Response(null, { status: 413 });
  }

  try {
    const reports = extractReports(JSON.parse(body));
    reports.slice(0, MAX_LOGGED_REPORTS).forEach(logReport);
  } catch {
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
}
