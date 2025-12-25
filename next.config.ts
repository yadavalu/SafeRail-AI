import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'export',      // Static export
  images: {
    unoptimized: true,   // GitHub Pages doesn't support the Next.js Image Optimization API
  },
  basePath: '/SafeRail-AI',
  assetPrefix: '/SafeRail-AI',
};

export default nextConfig;
