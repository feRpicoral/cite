import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Integration tests run against a live Postgres+pgvector instance (provided
 * in CI by the postgres service in .github/workflows/ci.yml, or locally by
 * setting INTEGRATION_DATABASE_URL).
 *
 * Kept in a separate config from unit tests so the default `yarn test` stays
 * fast and zero-dependency. Run with `yarn test:integration`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    exclude: ["node_modules", "dist", ".next", "e2e"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
