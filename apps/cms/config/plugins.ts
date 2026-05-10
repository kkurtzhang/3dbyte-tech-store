export default ({ env }) => ({
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
          displayedAttributes: ["Title", "Slug", "Content", "Excerpt", "publishedAt"],
        },
      },
      "blog-post-category": {
        indexName: env(
          "MEILISEARCH_BLOG_CATEGORY_INDEX_NAME",
          "blog_post_categories"
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
});
