export default ({ env }) => ({
  meilisearch: {
    config: {
      // Your meili host
      host: "http://meilisearch:7700",
      // Your master key or private key
      // apiKey: "M8QDSdT0UT74H3leQaq4c72ctnDIo1jAkxuK-AuE7cM",
      apiKey: "dN481cbEz7OMsg72N5qspU9S4Jsh9ceV9qe7dvt-2Gg",
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
          region: env("AWS_REGION"),
          params: {
            ACL: env("AWS_ACL", "public-read"),
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
