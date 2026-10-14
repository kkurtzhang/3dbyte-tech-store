const path = require("node:path")
const { createRequire } = require("node:module")
const medusaRequire = createRequire(require.resolve("@medusajs/medusa"))
const bundlerRequire = createRequire(medusaRequire.resolve("@medusajs/admin-bundler"))
const dashboardRoot = path.dirname(require.resolve("@medusajs/dashboard/package.json"))
const dashboardRequire = createRequire(path.join(dashboardRoot, "package.json"))
const dashboardSource = path.join(dashboardRoot, "src")
const shell = path.join(dashboardSource, "components/layout/shell/shell.tsx")
module.exports = {
  root: __dirname,
  cacheDir: path.join(__dirname, "../../../../../node_modules/.cache/admin-pagination-vite"),
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-query", "react-router-dom"],
    alias: {
      "@fixture/medusa-shell": shell,
      "@fixture/medusa-sidebar": path.join(dashboardSource, "providers/sidebar-provider/sidebar-provider.tsx"),
      "@fixture/medusa-native-table": path.join(dashboardSource, "components/table/data-table/data-table-root/data-table-root.tsx"),
      "@fixture/translations": path.join(dashboardSource, "i18n/translations/en.json"),
      "lodash.debounce": dashboardRequire.resolve("lodash.debounce"),
      "motion/react": dashboardRequire.resolve("motion/react"),
      "radix-ui": dashboardRequire.resolve("radix-ui"),
      "i18next": dashboardRequire.resolve("i18next"),
      "react-i18next": dashboardRequire.resolve("react-i18next"),
      "@tanstack/react-table": dashboardRequire.resolve("@tanstack/react-table"),
    },
  },
  plugins: [{
    name: "fixture-notifications-only",
    enforce: "pre",
    resolveId(source, importer) {
      if (importer === shell && source === "../notifications") return path.join(__dirname, "notifications.jsx")
    },
  }],
  esbuild: { jsx: "automatic" },
  optimizeDeps: { include: ["react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "i18next", "react-i18next", "@tanstack/react-table", "lodash.debounce", "motion/react", "radix-ui"], esbuildOptions: { jsx: "automatic" } },
  css: { postcss: { plugins: [bundlerRequire("tailwindcss")({ content: [path.join(__dirname, "*.jsx"), path.join(__dirname, "../../../src/admin/**/*.{ts,tsx}"), path.join(dashboardSource, "components/layout/shell/shell.tsx")] })] } },
  server: { host: "127.0.0.1", port: 5197, strictPort: true, fs: { allow: [path.resolve(__dirname, "../../../../..")] } },
  define: { __AUTH_TYPE__: JSON.stringify("session"), __BACKEND_URL__: JSON.stringify("/"), __JWT_TOKEN_STORAGE_KEY__: JSON.stringify(""), __BASE__: JSON.stringify("/") },
}
