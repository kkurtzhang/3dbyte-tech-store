const path = require("node:path");
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: "support-delivery.spec.cjs",
  workers: 1,
  retries: 0,
  outputDir: process.env.THREEDBYTE_ARTIFACTS_DIR
    ? path.join(
        process.env.THREEDBYTE_ARTIFACTS_DIR,
        "mcp-files/chrome-devtools",
      )
    : path.join(__dirname, "test-results/delivery"),
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5198",
    launchOptions: process.env.LOCAL_CHROME_PATH
      ? { executablePath: process.env.LOCAL_CHROME_PATH }
      : {},
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "pnpm --filter @3dbyte-tech-store/backend exec vite --config integration-tests/admin/delivery-fixture/vite.config.cjs",
    cwd: path.resolve(__dirname, "../../../.."),
    url: "http://127.0.0.1:5198",
    reuseExistingServer: false,
  },
});
