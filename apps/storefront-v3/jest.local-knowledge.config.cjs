const nextJest = require("next/jest");
const createJestConfig = nextJest({ dir: __dirname });
module.exports = createJestConfig({
  rootDir: __dirname,
  testEnvironment: "node",
  watchman: false,
  testMatch: ["<rootDir>/scripts/__tests__/local-knowledge*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
});
