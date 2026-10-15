const path = require("node:path");
module.exports = {
  root: __dirname,
  cacheDir: process.env.THREEDBYTE_ARTIFACTS_DIR
    ? path.join(process.env.THREEDBYTE_ARTIFACTS_DIR, "delivery-vite-cache")
    : path.join(__dirname, "../../../../../node_modules/.cache/delivery-vite"),
  resolve: { dedupe: ["react", "react-dom"] },
  esbuild: { jsx: "automatic" },
  server: {
    host: "127.0.0.1",
    port: 5198,
    strictPort: true,
    fs: {
      allow: [
        path.resolve(__dirname, "../../../../.."),
        path.dirname(require.resolve("@medusajs/dashboard/package.json")),
      ],
    },
  },
};
