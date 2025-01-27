// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      "undici": false
    };
    return config;
  },
  swcMinify: false,
  experimental: {
    serverActions: true
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate'
          }
        ]
      }
    ]
  },
  env: {
    VERCEL_URL: process.env.VERCEL_URL,
    MONGODB_URI: process.env.MONGODB_URI
  }
};

module.exports = nextConfig;