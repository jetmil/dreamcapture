import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: 'http://192.168.0.95:8200/uploads/:path*',
      },
      {
        source: '/dreams',
        destination: 'http://192.168.0.95:8200/dreams',
      },
      {
        source: '/dreams/my',
        destination: 'http://192.168.0.95:8200/dreams/my',
      },
    ];
  },
  experimental: {
    turbo: {},
  },
};

export default nextConfig;
