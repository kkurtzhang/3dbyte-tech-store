module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  env: {
    node: true,
    es2022: true,
    browser: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  extends: ["eslint:recommended"],
  plugins: [],
  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",
  },
  ignorePatterns: ["node_modules/", ".next/", "out/", "dist/"],
};
