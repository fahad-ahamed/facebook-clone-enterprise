/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
    serverActions: true,
  },
  images: {
    domains: ['localhost', 'cdn.facebook-clone.com', 's3.amazonaws.com'],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return [
      {
        source: '/api/graphql',
        destination: 'http://gateway:4000/graphql',
      },
      {
        source: '/api/:path*',
        destination: 'http://gateway:4000/api/:path*',
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001',
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.facebook-clone.com',
  },
};

module.exports = nextConfig;
