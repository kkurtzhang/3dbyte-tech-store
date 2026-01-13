/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@3dbyte-tech-store/shared-ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
