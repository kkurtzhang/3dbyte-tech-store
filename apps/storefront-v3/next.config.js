/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@3dbyte-tech-store/shared-ui"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_SPACE_DOMAIN,
      },
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_CDN_SPACE_DOMAIN,
      },
      {
        protocol: "https",
        hostname: "3dbyte-tech-dev-store-cms.s3.ap-southeast-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_SPACE_ENDPOINT,
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
