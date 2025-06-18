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
  compiler: {
    // Disable console stripping in production for easier live debugging. Set this back when ready.
    removeConsole: false,
  },
};

export default nextConfig;
