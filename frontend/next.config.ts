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
    // Disable console stripping in production for easier live debugging. Set this back when ready.
    removeConsole: false,
  },
};

export default nextConfig;
