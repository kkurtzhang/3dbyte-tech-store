jest.mock("@medusajs/framework/utils", () => ({
  ...jest.requireActual("@medusajs/framework/utils"),
  loadEnv: jest.fn(),
  defineConfig: (config: unknown) => config,
}));

describe("production migration coordination configuration", () => {
  it("opts only the support module into session locking", () => {
    jest.replaceProperty(process, "env", { NODE_ENV: "test" });
    try {
      const config = require("../../../../medusa-config") as {
        modules: { resolve?: string; options?: { migrationLock?: string } }[];
      };
      expect(
        config.modules.filter((module) => module.options?.migrationLock),
      ).toEqual([
        {
          resolve: "./src/modules/support-ticket",
          options: { migrationLock: "session" },
        },
      ]);
    } finally {
      jest.restoreAllMocks();
    }
  });
});
