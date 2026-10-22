import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Hackathon app: dynamic event routes + Supabase session */
  cacheComponents: false,
  distDir: process.env.BUMPIN_E2E === "1" ? ".next-e2e" : ".next",
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
