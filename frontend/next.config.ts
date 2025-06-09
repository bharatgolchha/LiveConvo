import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ucvfgfbjcrxbzppwjpuu.supabase.co',
        pathname: '/**',
      },
    ],
  },
  // Force app directory
  experimental: {
    appDir: true,
  },
};

export default nextConfig;
