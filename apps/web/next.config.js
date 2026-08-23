const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
    // Ensure styled-jsx is traced into standalone (required by next/dist/server/require-hook.js).
    outputFileTracingIncludes: {
      "/*": ["../../node_modules/styled-jsx/**/*", "./node_modules/styled-jsx/**/*"],
    },
  },
  async rewrites() {
    const apiUrl = process.env.API_URL ?? "http://localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
