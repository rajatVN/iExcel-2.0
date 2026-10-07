import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages load WASM / font / data files from disk at runtime and must
  // not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "pdfkit", "postgres"],
  // Make sure the PDF fonts ship with the server bundle when deployed.
  outputFileTracingIncludes: {
    "/api/**/*": ["./assets/fonts/**/*"],
  },
  poweredByHeader: false,
};

export default nextConfig;
