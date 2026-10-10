import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Every valid URL is prerendered; functions only render unknown URLs, which are 404s.
  // Without this, each dynamic route's function bundled all of /data (~1,600 files).
  outputFileTracingExcludes: {
    "/**": ["./data/**/*"],
  },
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
