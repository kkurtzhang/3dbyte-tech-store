import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "../content-security-policy";

describe("content security policy headers", () => {
  it("builds enforced and report-only CSP headers for production storefront traffic", () => {
    const headers = buildSecurityHeaders({
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://store.staging.3dbytetech.com.au",
      NEXT_PUBLIC_MEDUSA_BACKEND_URL: "https://api.staging.3dbytetech.com.au",
      NEXT_PUBLIC_STRAPI_URL: "https://cms.staging.3dbytetech.com.au/api",
      NEXT_PUBLIC_MEILISEARCH_HOST: "https://search.staging.3dbytetech.com.au",
    });

    expect(headers).toContainEqual({
      key: "Content-Security-Policy",
      value: expect.stringContaining("upgrade-insecure-requests"),
    });
    expect(headers).toContainEqual({
      key: "Content-Security-Policy-Report-Only",
      value: expect.stringContaining("report-uri /api/csp-report"),
    });

    const enforcedCsp = headers.find(
      (header) => header.key === "Content-Security-Policy"
    )?.value;
    const reportOnlyCsp = headers.find(
      (header) => header.key === "Content-Security-Policy-Report-Only"
    )?.value;

    expect(enforcedCsp).toContain("default-src 'self'");
    expect(enforcedCsp).toContain("object-src 'none'");
    expect(enforcedCsp).toContain("frame-ancestors 'none'");
    expect(enforcedCsp).toContain(
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://m.stripe.network"
    );
    expect(enforcedCsp).toContain(
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://www.openstreetmap.org"
    );
    expect(enforcedCsp).toContain(
      "connect-src 'self' https://store.staging.3dbytetech.com.au https://api.staging.3dbytetech.com.au https://cms.staging.3dbytetech.com.au https://search.staging.3dbytetech.com.au"
    );
    expect(enforcedCsp).toContain("report-to csp-endpoint");
    expect(reportOnlyCsp).not.toContain("upgrade-insecure-requests");
  });

  it("allows production deployments to roll back to report-only CSP with an env flag", () => {
    const headers = buildSecurityHeaders({
      CSP_ENFORCEMENT: "report-only",
      NODE_ENV: "production",
    });

    expect(headers).toContainEqual(
      expect.objectContaining({ key: "Content-Security-Policy-Report-Only" })
    );
    expect(headers).not.toContainEqual(
      expect.objectContaining({ key: "Content-Security-Policy" })
    );
  });

  it("normalizes configured origins and ignores path/query details", () => {
    const csp = buildContentSecurityPolicy({
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://store.staging.3dbytetech.com.au/",
      NEXT_PUBLIC_STRAPI_URL: "https://cms.staging.3dbytetech.com.au/api?token=do-not-echo",
      NEXT_PUBLIC_PRODUCT_IMAGE_HOSTS:
        "https://supplier.example.com/images,cdn.production-assets.example",
      AI_CATALOGUE_MEDIA_BASE_URL: "https://media.3dbytetech.com.au/assets",
    });

    expect(csp).toContain("https://cms.staging.3dbytetech.com.au");
    expect(csp).toContain("https://supplier.example.com");
    expect(csp).toContain("https://cdn.production-assets.example");
    expect(csp).toContain("https://media.3dbytetech.com.au");
    expect(csp).not.toContain("do-not-echo");
    expect(csp).not.toContain("https://cms.staging.3dbytetech.com.au/api");
  });

  it("keeps development eval allowances out of production", () => {
    expect(buildContentSecurityPolicy({ NODE_ENV: "production" })).not.toContain(
      "'unsafe-eval'"
    );
    expect(buildContentSecurityPolicy({ NODE_ENV: "development" })).toContain(
      "'unsafe-eval'"
    );
  });

  it("drops placeholder host values from environment-derived directives", () => {
    const csp = buildContentSecurityPolicy({
      NODE_ENV: "production",
      NEXT_PUBLIC_SPACE_DOMAIN: "your_space_domain",
      NEXT_PUBLIC_SPACE_ENDPOINT: "https://your_space_endpoint",
      NEXT_PUBLIC_PRODUCT_IMAGE_HOSTS:
        "your-product-image-host,supplier.example.com",
    });

    expect(csp).not.toContain("your_space_domain");
    expect(csp).not.toContain("your_space_endpoint");
    expect(csp).not.toContain("your-product-image-host");
    expect(csp).toContain("https://supplier.example.com");
  });
});
