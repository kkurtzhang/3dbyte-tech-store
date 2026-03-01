import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const imageHostnames = [
  process.env.NEXT_PUBLIC_SPACE_DOMAIN,
  process.env.NEXT_PUBLIC_CDN_SPACE_DOMAIN,
  process.env.NEXT_PUBLIC_SPACE_ENDPOINT,
].filter((hostname): hostname is string => Boolean(hostname));

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  transpilePackages: ["@3dbyte-tech-store/shared-ui"],
  async redirects() {
    return [
      {
        source: "/about-us",
        destination: "/about",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
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
        hostname: "3dbyte-tech-dev-store-cms.s3.ap-southeast-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      ...imageHostnames.map((hostname) => ({
        protocol: "https" as const,
        hostname,
      })),
    ],
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    rehypePlugins: ["rehype-highlight"],
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
