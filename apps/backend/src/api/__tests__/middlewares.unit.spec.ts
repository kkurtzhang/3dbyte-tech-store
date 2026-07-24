const mockAuthenticate = jest.fn(
  (
    actorType: string,
    authTypes: string[],
    options?: Record<string, unknown>,
  ) => ({
    actorType,
    authTypes,
    options,
  }),
);

jest.mock("@medusajs/framework/http", () => ({
  authenticate: mockAuthenticate,
  defineMiddlewares: (config: unknown) => config,
  validateAndTransformBody: jest.fn(() => ({ type: "body-validation" })),
  validateAndTransformQuery: jest.fn(() => ({ type: "query-validation" })),
}));

describe("API middleware configuration", () => {
  const hasRateLimit = (
    route: { middlewares?: Array<unknown> } | undefined,
    name: string,
  ) =>
    Boolean(
      route?.middlewares?.some(
        (middleware) =>
          typeof middleware === "function" &&
          (middleware as { rateLimitRuleName?: string }).rateLimitRuleName ===
            name,
      ),
    );

  it("allows authenticated but unregistered customers to claim an account", async () => {
    const { default: configuration } = await import("../middlewares");
    const claimRoute = configuration.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/store/customers/claim-account",
    );

    expect(claimRoute).toBeDefined();
    expect(claimRoute.middlewares[0]).toEqual({
      actorType: "customer",
      authTypes: ["session", "bearer"],
      options: {
        allowUnregistered: true,
      },
    });
  });

  it("protects and validates the admin identity issue resolution route", async () => {
    const { default: configuration } = await import("../middlewares");
    const resolutionRoute = configuration.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/admin/identity-issues/resolve",
    );

    expect(resolutionRoute).toBeDefined();
    expect(resolutionRoute.methods).toEqual(["POST"]);
    expect(resolutionRoute.middlewares[0]).toEqual({
      actorType: "user",
      authTypes: ["session", "bearer", "api-key"],
      options: undefined,
    });
    expect(resolutionRoute.middlewares[1]).toEqual({
      type: "body-validation",
    });
  });

  it("protects AI product draft reads and cleanup mutations", async () => {
    const { default: configuration } = await import("../middlewares");
    const collectionRoute = configuration.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/admin/ai-product-drafts",
    );
    const itemRoute = configuration.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/admin/ai-product-drafts/:id*",
    );

    expect(collectionRoute?.methods).toEqual(["GET", "DELETE"]);
    expect(collectionRoute?.middlewares[0]).toEqual({
      actorType: "user",
      authTypes: ["session", "bearer", "api-key"],
      options: undefined,
    });
    expect(itemRoute?.middlewares[0]).toEqual({
      actorType: "user",
      authTypes: ["session", "bearer", "api-key"],
      options: undefined,
    });
  });

  it("rate limits expensive public storefront lookup routes", async () => {
    const { default: configuration } = await import("../middlewares");

    const addressAutocompleteRoute = configuration.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/store/addresses/autocomplete",
    );
    const localityAutocompleteRoute = configuration.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/store/localities/autocomplete",
    );

    expect(
      hasRateLimit(addressAutocompleteRoute, "store_address_autocomplete"),
    ).toBe(true);
    expect(
      hasRateLimit(localityAutocompleteRoute, "store_locality_autocomplete"),
    ).toBe(true);
  });

  it("rate limits public customer-intent mutation endpoints", async () => {
    const { default: configuration } = await import("../middlewares");

    const supportRoute = configuration.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/store/support-tickets",
    );
    const newsletterRoute = configuration.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/store/newsletter/subscribe",
    );
    const waitlistRoute = configuration.routes.find(
      (route: { matcher: string; methods?: string[] }) =>
        route.matcher === "/store/waitlist" && route.methods?.includes("POST"),
    );
    const orderLookupRoute = configuration.routes.find(
      (route: { matcher: string; methods?: string[] }) =>
        route.matcher === "/store/orders/lookup" &&
        route.methods?.includes("POST"),
    );

    expect(hasRateLimit(supportRoute, "store_support_ticket")).toBe(true);
    expect(hasRateLimit(newsletterRoute, "store_newsletter_subscribe")).toBe(
      true,
    );
    expect(hasRateLimit(waitlistRoute, "store_waitlist_join")).toBe(true);
    expect(hasRateLimit(orderLookupRoute, "store_order_lookup")).toBe(true);
  });

  it("requires customer ownership or signed proof for direct order reads", async () => {
    const { default: configuration } = await import("../middlewares");
    const orderReadRoute = configuration.routes.find(
      (route: { matcher: string; methods?: string[] }) =>
        route.matcher === "/store/orders/:id" &&
        route.methods?.includes("GET"),
    );

    expect(orderReadRoute).toBeDefined();
    expect(orderReadRoute?.middlewares[0]).toEqual({
      actorType: "customer",
      authTypes: ["session", "bearer"],
      options: { allowUnauthenticated: true },
    });
    expect(orderReadRoute?.middlewares[1]).toEqual(
      expect.objectContaining({ orderAccessMiddleware: true }),
    );
  });

  it("rate limits authenticated account security mutations after authentication", async () => {
    const { default: configuration } = await import("../middlewares");

    const emailChangeRoute = configuration.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/store/customers/me/email-change-requests",
    );
    const googleLinkRoute = configuration.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/store/customers/me/google-link-intents",
    );
    const setPasswordRoute = configuration.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/store/customers/me/login-methods/emailpass",
    );

    expect(emailChangeRoute?.middlewares[0]).toMatchObject({
      actorType: "customer",
    });
    expect(hasRateLimit(emailChangeRoute, "customer_email_change")).toBe(true);
    expect(googleLinkRoute?.middlewares[0]).toMatchObject({
      actorType: "customer",
    });
    expect(hasRateLimit(googleLinkRoute, "customer_google_link")).toBe(true);
    expect(setPasswordRoute?.middlewares[0]).toMatchObject({
      actorType: "customer",
    });
    expect(hasRateLimit(setPasswordRoute, "customer_set_password")).toBe(true);
  });

  it("rate limits sensitive admin and internal automation endpoints", async () => {
    const { default: configuration } = await import("../middlewares");

    const meilisearchSyncRoute = configuration.routes.find(
      (route: { matcher: string; methods?: string[] }) =>
        route.matcher === "/admin/meilisearch*" &&
        route.methods?.includes("POST"),
    );
    const aiRoute = configuration.routes.find(
      (route: { matcher: string; methods?: string[] }) =>
        route.matcher === "/ai*" && route.methods?.includes("POST"),
    );

    expect(hasRateLimit(meilisearchSyncRoute, "admin_meilisearch_sync")).toBe(
      true,
    );
    expect(hasRateLimit(aiRoute, "internal_ai")).toBe(true);
  });
});
