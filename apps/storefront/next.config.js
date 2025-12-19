const checkEnvVariables = require('./check-env-variables')

checkEnvVariables()

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  cacheComponents: true, // Next.js 16.1.0+ - Cache Components enabled at root level
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'medusa-public-images.s3.eu-west-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'medusa-server-testing.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'medusa-server-testing.s3.us-east-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SPACE_DOMAIN,
      },
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_CDN_SPACE_DOMAIN,
      },
      {
        protocol: 'https',
        hostname: '3dbyte-tech-dev-store-cms.s3.ap-southeast-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SPACE_ENDPOINT,
      },
    ],
  },
}

module.exports = nextConfig
