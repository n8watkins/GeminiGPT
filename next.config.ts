import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native node modules external instead of bundling them into route
  // handlers (Turbopack cannot place native .node assets in ESM chunks).
  serverExternalPackages: ["@lancedb/lancedb", "better-sqlite3", "apache-arrow"],
  webpack: (config, { isServer }) => {
    // Allow socket.io-client to work in the browser
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }

    return config;
  },
};

export default nextConfig;
