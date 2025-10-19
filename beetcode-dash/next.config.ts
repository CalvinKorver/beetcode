import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for multiple lockfiles warning - monorepo setup
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
