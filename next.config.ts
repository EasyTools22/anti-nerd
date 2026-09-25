import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.APP_BASE_URL
    ? [new URL(process.env.APP_BASE_URL).hostname]
    : [],
  logging: {
    incomingRequests: { ignore: [/\/api\/integrations\/shopify\/callback/] },
    serverFunctions: false,
  },
  redirects() {
    return [
      { source: "/customer-service", destination: "/inbox", permanent: false },
    ];
  },
};

export default nextConfig;
