import { buildMedusaHttpConfig } from "../medusa-runtime-config";

describe("buildMedusaHttpConfig", () => {
  it("keeps local CORS defaults and development secret fallbacks outside production-like environments", () => {
    const config = buildMedusaHttpConfig({
      NODE_ENV: "development",
    });

    expect(config.storeCors).toContain("http://localhost:3001");
    expect(config.adminCors).toContain("http://localhost:9000");
    expect(config.authCors).toContain("http://localhost:8000");
    expect(config.jwtSecret).toBe("supersecret");
    expect(config.cookieSecret).toBe("supersecret");
  });

  it("uses only explicit CORS origins in staging", () => {
    const config = buildMedusaHttpConfig({
      APP_ENV: "staging",
      STORE_CORS: " https://store.staging.example.com ,https://store.staging.example.com",
      ADMIN_CORS: "https://api.staging.example.com",
      AUTH_CORS: "https://store.staging.example.com, https://api.staging.example.com",
      JWT_SECRET: "staging-jwt-secret-with-at-least-32-chars",
      COOKIE_SECRET: "staging-cookie-secret-with-at-least-32",
    });

    expect(config.storeCors).toBe("https://store.staging.example.com");
    expect(config.adminCors).toBe("https://api.staging.example.com");
    expect(config.authCors).toBe(
      "https://store.staging.example.com,https://api.staging.example.com",
    );
    expect(config.storeCors).not.toContain("localhost");
    expect(config.authCors).not.toContain("127.0.0.1");
  });

  it("requires explicit CORS values in production-like environments", () => {
    expect(() =>
      buildMedusaHttpConfig({
        APP_ENV: "production",
        STORE_CORS: "https://store.example.com",
        ADMIN_CORS: "https://api.example.com",
        JWT_SECRET: "production-jwt-secret-with-at-least-32",
        COOKIE_SECRET: "production-cookie-secret-at-least-32",
      }),
    ).toThrow("AUTH_CORS is required in production");
  });

  it("rejects missing or development secrets in production-like environments", () => {
    expect(() =>
      buildMedusaHttpConfig({
        APP_ENV: "staging",
        STORE_CORS: "https://store.staging.example.com",
        ADMIN_CORS: "https://api.staging.example.com",
        AUTH_CORS: "https://store.staging.example.com,https://api.staging.example.com",
        JWT_SECRET: "supersecret",
        COOKIE_SECRET: "staging-cookie-secret-with-at-least-32",
      }),
    ).toThrow("JWT_SECRET must not use a development placeholder in staging");

    expect(() =>
      buildMedusaHttpConfig({
        NODE_ENV: "production",
        STORE_CORS: "https://store.example.com",
        ADMIN_CORS: "https://api.example.com",
        AUTH_CORS: "https://store.example.com,https://api.example.com",
        COOKIE_SECRET: "production-cookie-secret-at-least-32",
      }),
    ).toThrow("JWT_SECRET is required in production");
  });

  it("rejects copied placeholder secrets in production-like environments", () => {
    expect(() =>
      buildMedusaHttpConfig({
        APP_ENV: "staging",
        STORE_CORS: "https://store.staging.example.com",
        ADMIN_CORS: "https://api.staging.example.com",
        AUTH_CORS: "https://store.staging.example.com,https://api.staging.example.com",
        JWT_SECRET: "replace_with_staging_random_64_char_secret",
        COOKIE_SECRET: "staging-cookie-secret-with-at-least-32",
      }),
    ).toThrow("JWT_SECRET must not use a development placeholder in staging");
  });
});
