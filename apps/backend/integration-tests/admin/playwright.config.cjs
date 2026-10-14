const path = require("node:path")
const { defineConfig } = require("@playwright/test")
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: "ai-draft-pagination.spec.cjs",
  fullyParallel: false,
  workers: 1,
  outputDir: process.env.THREEDBYTE_ARTIFACTS_DIR ? path.join(process.env.THREEDBYTE_ARTIFACTS_DIR, "pagination-tests") : path.join(__dirname, "test-results"),
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:5197", viewport: { width: 1440, height: 900 }, screenshot: "only-on-failure" },
  webServer: {
    command: "pnpm --filter @3dbyte-tech-store/backend exec vite --config integration-tests/admin/pagination-fixture/vite.config.cjs",
    cwd: path.resolve(__dirname, "../../../.."),
    url: "http://127.0.0.1:5197",
    reuseExistingServer: !process.env.CI,
  },
})
