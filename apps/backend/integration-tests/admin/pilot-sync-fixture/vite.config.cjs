const path = require("node:path");
const { createRequire } = require("node:module");
const medusaRequire = createRequire(require.resolve("@medusajs/medusa"));
const bundlerRequire = createRequire(medusaRequire.resolve("@medusajs/admin-bundler"));
module.exports = {
 root: __dirname,
 cacheDir: path.resolve(__dirname, "../../../../../node_modules/.cache/pilot-sync-vite"),
 resolve: { dedupe: ["react", "react-dom", "@tanstack/react-query"] },
 esbuild: { jsx: "automatic" },
 css: { postcss: { plugins: [bundlerRequire("tailwindcss")({content:[path.join(__dirname,"*.jsx"),path.join(__dirname,"../../../src/admin/**/*.{ts,tsx}")]})] } },
 server: { host: "127.0.0.1", port: 5201, strictPort: true, fs: { allow: [path.resolve(__dirname,"../../../../..")] } },
 define: { __AUTH_TYPE__: JSON.stringify("session"), __JWT_TOKEN_STORAGE_KEY__: JSON.stringify("") },
};
