import type { NextConfig } from "next";

const isExport = process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
  /* config options here */
  output: isExport ? 'export' : undefined,
  cacheComponents: isExport ? false : true,
  partialPrefetching: isExport ? false : true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
