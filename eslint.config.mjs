import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Frontera lib/db (ver lib/db/AGENTS.md): la persistencia solo se importa
  // desde lib/services/ y desde los tests. Todo lo demás pasa por services.
  {
    ignores: ["lib/db/**", "lib/services/**", "**/*.test.*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/db", "**/lib/db/**"],
              message:
                "La base solo se toca desde lib/services/ (ver lib/db/AGENTS.md).",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright artifacts.
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
  ]),
]);

export default eslintConfig;
