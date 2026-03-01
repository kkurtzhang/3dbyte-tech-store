import { loadEnv, defineConfig } from "@medusajs/framework/utils";
import { customSchema } from "./src/custom-index-schema";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    redisUrl: process.env.REDIS_URL,
  },
  modules: [
    {
      resolve: "./src/modules/strapi",
      options: {
        apiUrl: process.env.STRAPI_API_URL || "http://localhost:1337",
        apiToken: process.env.STRAPI_API_TOKEN || "",
      },
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              prefix: process.env.S3_ROOTPATH,
              // other options...
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/brand",
    },
    {
      resolve: "./src/modules/wishlist",
    },
    {
      resolve: "./src/modules/reviews",
    },
    {
      resolve: "./src/modules/newsletter",
    },
    {
      resolve: "./src/modules/meilisearch",
      options: {
        host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
        apiKey: process.env.MEILISEARCH_API_KEY || "",
        productIndexName:
          process.env.MEILISEARCH_PRODUCT_INDEX_NAME || "products",
        categoryIndexName:
          process.env.MEILISEARCH_CATEGORY_INDEX_NAME || "categories",
        brandIndexName: process.env.MEILISEARCH_BRAND_INDEX_NAME || "brands",
      },
    },
    {
      resolve: "@medusajs/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_SECRET_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },
    // {
    //   resolve: "@medusajs/index",
    //   options: {
    //     schema: customSchema,
    //   },
    // },
  ],
  plugins: [
    {
      resolve: "@medusajs/draft-order",
      options: {},
    },
    // {
    //   resolve: "@lodashventure/medusa-media-manager",
    //   options: {
    //     storage: {
    //       driver: "s3",
    //       bucket: process.env.MEDIA_BUCKET,
    //       region: process.env.MEDIA_REGION,
    //       publicCdn: process.env.MEDIA_ENDPOINT,
    //       signed: { enabled: true, ttlSeconds: 3600 },
    //     },
    //     presets: [
    //       { name: "thumbnail", width: 200, height: 200, fit: "cover" },
    //       { name: "small", width: 640 },
    //       { name: "medium", width: 1024 },
    //       { name: "large", width: 1600 },
    //     ],
    //     generate: { mode: "eager" },
    //     svg: { sanitize: true },
    //     moderation: { enabled: true },
    //     rbac: { deleteRequiresNoUsage: true },
    //   },
    // },
  ],
});
