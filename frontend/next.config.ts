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
        hostname: 'ucvfgfbjcrxbzppwjpuu.storage.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ucvfgfbjcrxbzppwjpuu.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'xkxjycccifwyxgtvflxz.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'xkxjycccifwyxgtvflxz.storage.supabase.co',
        pathname: '/**',
      },
    ],
  },
  compiler: {
    // Remove console logs in production builds
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
