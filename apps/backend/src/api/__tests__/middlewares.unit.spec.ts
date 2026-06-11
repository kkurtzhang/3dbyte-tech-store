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
});
