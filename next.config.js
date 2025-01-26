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
};

module.exports = nextConfig;
