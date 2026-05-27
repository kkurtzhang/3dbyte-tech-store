type EnvReader = {
  (key: string): string | undefined;
  <T>(key: string, defaultValue: T): T;
  bool: (key: string, defaultValue?: boolean) => boolean;
};

const CMS_EMAIL_SENDERS = {
  production: {
    sender: "3D Byte Tech CMS <cms@3dbytetech.com.au>",
    testAddress: "cms@3dbytetech.com.au",
  },
  staging: {
    sender: "3D Byte Tech Staging CMS <staging-cms@3dbytetech.com.au>",
    testAddress: "staging-cms@3dbytetech.com.au",
  },
};

const getCmsEmailSettings = (appEnv: string) => {
  const senderConfig =
    appEnv === "production"
      ? CMS_EMAIL_SENDERS.production
      : CMS_EMAIL_SENDERS.staging;

  return {
    defaultFrom: senderConfig.sender,
    defaultReplyTo: senderConfig.sender,
    testAddress: senderConfig.testAddress,
  };
};

export default ({ env }: { env: EnvReader }) => {
  const appEnv = env("APP_ENV", env("NODE_ENV", "development"));

  return {
    email: {
      config: {
        provider: "nodemailer",
        providerOptions: {
          host: "smtp.resend.com",
          port: 465,
          secure: true,
          auth: {
            user: "resend",
            pass: env("STRAPI_RESEND_API_KEY"),
          },
        },
        settings: getCmsEmailSettings(appEnv),
      },
    },
    meilisearch: {
      config: {
        // Your meili host
        host: env("MEILISEARCH_HOST", "http://localhost:7700"),
        // Your master key or private key
        // apiKey: "M8QDSdT0UT74H3leQaq4c72ctnDIo1jAkxuK-AuE7cM",
        apiKey: env("MEILISEARCH_API_KEY"),
        blog: {
          indexName: env("MEILISEARCH_BLOG_INDEX_NAME", "blog"),
          settings: {
            searchableAttributes: ["Title", "Content", "Excerpt"],
            filterableAttributes: ["Categories"],
            sortableAttributes: ["Title"],
            displayedAttributes: [
              "Title",
              "Slug",
              "Content",
              "Excerpt",
              "publishedAt",
            ],
          },
        },
        "blog-post-category": {
          indexName: env(
            "MEILISEARCH_BLOG_CATEGORY_INDEX_NAME",
            "blog_post_categories",
          ),
          settings: {
            searchableAttributes: ["Title"],
            displayedAttributes: ["Title", "Slug", "publishedAt"],
          },
        },
      },
    },
    upload: {
      config: {
        provider: "aws-s3",
        providerOptions: {
          baseUrl: env("AWS_BASE_URL"),
          rootPath: env("AWS_ROOT_PATH"),
          s3Options: {
            credentials: {
              accessKeyId: env("AWS_ACCESS_KEY_ID"),
              secretAccessKey: env("AWS_SECRET_ACCESS_KEY"),
            },
            endpoint: env("AWS_ENDPOINT"),
            forcePathStyle: env.bool("AWS_FORCE_PATH_STYLE", true),
            region: env("AWS_REGION"),
            params: {
              ACL: null,
              signedUrlExpires: env("AWS_SIGNED_URL_EXPIRES", 15 * 60),
              Bucket: env("AWS_BUCKET"),
            },
          },
        },
        actionOptions: {
          upload: {},
          uploadStream: {},
          delete: {},
        },
      },
    },
  };
};
