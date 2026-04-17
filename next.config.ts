import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow serving uploaded images from public/uploads
  images: {
    remotePatterns: [],
  },
  // Increase request body size for file uploads (App Router uses experimental.serverActions for limit)
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
