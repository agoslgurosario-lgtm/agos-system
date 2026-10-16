import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: [
    "192.168.1.6",
  ],
  // trailingSlash: true,
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: `${process.env.BACKEND_URL}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;