import type { Context, OrderTypes } from "@medusajs/framework/types";
import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils";
import { customSchema } from "./src/custom-index-schema";
import { generateOrderCustomDisplayId } from "./src/lib/order-display-id";
import { getMaildevNotificationProvider } from "./src/modules/maildev-notification/config";
import { getResendNotificationProvider } from "./src/modules/resend-notification/config";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const maildevNotificationProvider = getMaildevNotificationProvider();
const notificationProvider =
  getResendNotificationProvider() || maildevNotificationProvider;

const mergeCors = (value: string | undefined, defaults: string[]): string => {
  return Array.from(
    new Set(
      [value, ...defaults]
        .filter(Boolean)
        .flatMap((entry) => entry!.split(","))
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ).join(",");
};

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    workerMode:
      (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server") ||
      "server",
    http: {
      storeCors: mergeCors(process.env.STORE_CORS, [
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
      ]),
      adminCors: mergeCors(process.env.ADMIN_CORS, [
        "http://localhost:9000",
        "http://127.0.0.1:9000",
      ]),
      authCors: mergeCors(process.env.AUTH_CORS, [
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:9000",
        "http://127.0.0.1:9000",
        "http://localhost:8000",
      ]),
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    redisUrl: process.env.REDIS_URL,
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },
  modules: [
    {
      key: Modules.ORDER,
      options: {
        generateCustomDisplayId: async (
          _order: OrderTypes.CreateOrderDTO,
          _sharedContext: Context,
        ): Promise<string> => generateOrderCustomDisplayId(),
      },
    },
    {
      resolve: "./src/modules/strapi",
      options: {
        apiUrl:
          process.env.STRAPI_API_URL ||
          process.env.STRAPI_URL ||
          "http://localhost:1337",
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
      resolve: "./src/modules/preorder",
    },
    {
      resolve: "./src/modules/bundled-product",
    },
    {
      resolve: "./src/modules/wishlist",
    },
    {
      resolve: "./src/modules/waitlist",
    },
    {
      resolve: "./src/modules/reviews",
    },
    {
      resolve: "./src/modules/newsletter",
    },
    ...(notificationProvider
      ? [
          {
            resolve: "@medusajs/medusa/notification",
            options: {
              providers: [notificationProvider],
            },
          },
        ]
      : []),
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
        addressIndexName:
          process.env.MEILISEARCH_ADDRESS_INDEX_NAME || "addresses",
        localityIndexName:
          process.env.MEILISEARCH_LOCALITY_INDEX_NAME || "localities",
      },
    },
    {
      resolve: "./src/modules/karrio",
      options: {
        apiUrl: process.env.KARRIO_API_URL || "http://localhost:5002",
        apiKey: process.env.KARRIO_API_KEY || "",
        testMode: process.env.KARRIO_TEST_MODE === "true",
      },
    },
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/fulfillment-manual",
            id: "manual",
          },
          {
            resolve: "./src/modules/karrio-fulfillment",
            id: "karrio",
            options: {
              apiUrl: process.env.KARRIO_API_URL || "http://localhost:5002",
              apiKey: process.env.KARRIO_API_KEY || "",
              testMode: process.env.KARRIO_TEST_MODE === "true",
            },
          },
        ],
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
