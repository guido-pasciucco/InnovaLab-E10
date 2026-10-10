import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // server-only throws outside a React Server environment; use the no-op build it ships for react-server.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Restore every vi.spyOn spy before each test, so a spy never leaks into the next one.
    restoreMocks: true,
    // Playwright specs run with `bun run test:e2e`, never under vitest.
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          // No network or database: integration tests run in their own project.
          exclude: [...configDefaults.exclude, "tests/e2e/**", "**/*.int.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          // Real local Postgres (`bun run e2e:up` + `.env.test`).
          include: ["**/*.int.test.ts"],
          // One file at a time against the shared local stack.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
