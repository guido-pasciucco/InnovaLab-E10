import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // server-only throws outside a React Server environment.
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Playwright specs run with `bun run test:e2e`, never under vitest.
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
