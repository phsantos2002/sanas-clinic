import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/**/*.test.ts", "**/*.test.ts", "**/*.spec.ts"],
    exclude: [
      "node_modules",
      ".next",
      "**/__tests__/e2e/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "**/__tests__/**",
        "**/*.config.*",
        "prisma/**",
        "public/**",
      ],
      thresholds: {
        // Meta de cobertura mínima — aumentar a cada sprint
        lines:     40,
        functions: 40,
        branches:  30,
        statements: 40,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
