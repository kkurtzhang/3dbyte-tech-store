import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import globals from "globals"

export default defineConfig([
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "dist/**"],
  },
  {
    ...js.configs.recommended,
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
      sourceType: "module",
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
])
