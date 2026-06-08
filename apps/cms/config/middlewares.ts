function originFromUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );

    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function getUploadMediaSources() {
  const bucket = process.env.AWS_BUCKET?.trim();
  const region = process.env.AWS_REGION?.trim();
  const s3BucketOrigin =
    bucket && region ? `https://${bucket}.s3.${region}.amazonaws.com` : null;

  return Array.from(
    new Set(
      [
        "market-assets.strapi.io",
        originFromUrl(process.env.AWS_BASE_URL),
        originFromUrl(process.env.CDN_URL),
        originFromUrl(process.env.AWS_ENDPOINT),
        s3BucketOrigin,
      ].filter((source): source is string => Boolean(source)),
    ),
  );
}

const uploadMediaSources = getUploadMediaSources();

export default [
  "strapi::logger",
  "strapi::errors",
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            ...uploadMediaSources,
          ],
          "media-src": [
            "'self'",
            "data:",
            "blob:",
            ...uploadMediaSources,
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
];
