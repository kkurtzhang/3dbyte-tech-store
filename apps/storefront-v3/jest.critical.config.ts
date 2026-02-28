import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({
  dir: "./",
})

const criticalJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  watchman: false,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
    "^.+\\.(css|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",
    "^.+\\.(jpg|jpeg|png|gif|webp|svg|avif)$": "<rootDir>/__mocks__/fileMock.js",
  },
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.[jt]s?(x)",
    "<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  collectCoverageFrom: [
    "src/components/filters/active-filter-chips.tsx",
    "src/components/filters/filter-section.tsx",
    "src/components/filters/filter-sidebar.tsx",
    "src/components/filters/price-range-slider.tsx",
    "src/components/filters/toggle-filter.tsx",
    "src/context/cart-context.tsx",
    "src/context/compare-context.tsx",
    "src/context/inventory-alert-context.tsx",
    "src/context/saved-items-context.tsx",
    "src/context/wishlist-context.tsx",
    "src/features/checkout/components/checkout-stepper.tsx",
    "src/features/checkout/components/checkout-summary.tsx",
    "src/features/checkout/components/delivery-step.tsx",
    "src/features/product/components/product-card.tsx",
    "src/features/product/components/product-gallery.tsx",
    "src/features/shop/components/shop-sort.tsx",
    "src/lib/hooks/use-debounce.ts",
    "src/lib/hooks/use-recently-viewed.ts",
    "src/lib/search/products.ts",
    "src/lib/utils/search-params.ts",
    "src/lib/utils/url.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  transformIgnorePatterns: [
    "/node_modules/(?!(@medusajs|meilisearch|lucide-react)/)",
  ],
} satisfies Config

export default createJestConfig(criticalJestConfig)
