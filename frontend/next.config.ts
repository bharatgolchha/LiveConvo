import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // Reduce API route logging in development
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Optional: Suppress some development logging
  experimental: {
    instrumentationHook: false,
  },
};

export default nextConfig;
