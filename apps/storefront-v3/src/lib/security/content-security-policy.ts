type SecurityHeader = {
  key: string;
  value: string;
};

type CspEnv = Record<string, string | undefined>;

const REPORT_ENDPOINT = "/api/csp-report";

const STRIPE_SCRIPT_SOURCES = [
  "https://js.stripe.com",
  "https://checkout.stripe.com",
];

const STRIPE_CONNECT_SOURCES = [
  "https://api.stripe.com",
  "https://checkout.stripe.com",
  "https://r.stripe.com",
  "https://q.stripe.com",
  "https://m.stripe.network",
];

const FRAME_SOURCES = [
  "https://js.stripe.com",
  "https://hooks.stripe.com",
  "https://checkout.stripe.com",
  "https://www.openstreetmap.org",
];

const CONNECT_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "MEDUSA_BACKEND_URL",
  "MEDUSA_SERVER_BACKEND_URL",
  "NEXT_PUBLIC_STRAPI_URL",
  "NEXT_PUBLIC_MEILISEARCH_HOST",
  "MEILISEARCH_SERVER_HOST",
] as const;

const IMAGE_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_STRAPI_URL",
  "AI_CATALOGUE_MEDIA_BASE_URL",
  "NEXT_PUBLIC_SPACE_DOMAIN",
  "NEXT_PUBLIC_CDN_SPACE_DOMAIN",
  "NEXT_PUBLIC_SPACE_ENDPOINT",
  "NEXT_PUBLIC_PRODUCT_IMAGE_HOSTS",
] as const;

function compactDirective(parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function isPlaceholderHostname(hostname: string) {
  const lowerHostname = hostname.toLowerCase();

  return (
    lowerHostname.includes("_") ||
    lowerHostname.startsWith("your-") ||
    lowerHostname.startsWith("your.")
  );
}

function splitEnvOrigins(value: string | undefined) {
  if (!value) return [];

  return value
    .split(",")
    .map((part) => normalizeOrigin(part))
    .filter((origin): origin is string => Boolean(origin));
}

function normalizeOrigin(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) return null;

  const urlValue = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    const url = new URL(urlValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (isPlaceholderHostname(url.hostname)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function originsFromEnv(env: CspEnv, keys: readonly string[]) {
  return unique(keys.flatMap((key) => splitEnvOrigins(env[key])));
}

export function buildContentSecurityPolicy(env: CspEnv = process.env) {
  const isDevelopment = env.NODE_ENV === "development";
  const connectSources = unique([
    ...originsFromEnv(env, CONNECT_ENV_KEYS),
    ...STRIPE_CONNECT_SOURCES,
  ]);
  const imageSources = unique(originsFromEnv(env, IMAGE_ENV_KEYS));

  const directives = [
    "default-src 'self'",
    compactDirective([
      "script-src 'self' 'unsafe-inline'",
      isDevelopment && "'unsafe-eval'",
      ...STRIPE_SCRIPT_SOURCES,
    ]),
    "style-src 'self' 'unsafe-inline'",
    compactDirective(["img-src 'self' data: blob: https: http://localhost:*", ...imageSources]),
    "font-src 'self' data:",
    compactDirective(["connect-src 'self'", ...connectSources]),
    compactDirective(["frame-src 'self'", ...FRAME_SOURCES]),
    "worker-src 'self' blob:",
    "media-src 'self' data: blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    !isDevelopment && "upgrade-insecure-requests",
    `report-uri ${REPORT_ENDPOINT}`,
    "report-to csp-endpoint",
  ];

  return directives.filter(Boolean).join("; ");
}

export function buildSecurityHeaders(env: CspEnv = process.env): SecurityHeader[] {
  return [
    {
      key: "Content-Security-Policy-Report-Only",
      value: buildContentSecurityPolicy(env),
    },
    {
      key: "Reporting-Endpoints",
      value: `csp-endpoint="${REPORT_ENDPOINT}"`,
    },
    {
      key: "Report-To",
      value: JSON.stringify({
        group: "csp-endpoint",
        max_age: 60 * 60 * 24 * 30,
        endpoints: [{ url: REPORT_ENDPOINT }],
      }),
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
  ];
}
