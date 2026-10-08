import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // Next.js's server-only guard throws outside the React server runtime.
      "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    env: { PGLITE_DATA_DIR: "memory://" },
    testTimeout: 30_000,
  },
});
