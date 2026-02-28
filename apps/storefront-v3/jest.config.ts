import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you soon)
    "^@/(.*)$": "<rootDir>/src/$1",
    // Handle CSS modules (with identity-obj-proxy)
    "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
    // Handle CSS imports (without CSS modules)
    "^.+\\.(css|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",
    // Handle image imports
    "^.+\\.(jpg|jpeg|png|gif|webp|svg|avif)$": "<rootDir>/__mocks__/fileMock.js",
  },
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.[jt]s?(x)",
    "<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/?(*.)+(spec|test).{js,jsx,ts,tsx}",
    "!src/app/layout.tsx",
    "!src/app/**/layout.tsx",
    "!src/app/**/loading.tsx",
    "!src/app/**/error.tsx",
    "!src/app/**/not-found.tsx",
  ],
  coverageThreshold: {
    // Start with achievable thresholds, increase as more tests are added
    // Target: 80% across the board eventually
    global: {
      branches: 4,
      functions: 4,
      lines: 4,
      statements: 4,
    },
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  transformIgnorePatterns: [
    "/node_modules/(?!(@medusajs|meilisearch|lucide-react)/)",
  ],
} satisfies Config

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig)
