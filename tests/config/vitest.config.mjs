// Mirror of scripts/build/build.mjs: force the test environment even when the calling
// shell sets NODE_ENV. Vitest only defaults NODE_ENV to "test" when it is unset,
// so a host that exports NODE_ENV=production (Render does, and the deploy runs
// `npm test` inside that build) would make Vite resolve React's production
// export condition, where act() is stripped and every render() throws.
process.env.NODE_ENV = "test";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // This file lives in tests/config/; every path below is relative to the repository root.
  root: fileURLToPath(new URL("../..", import.meta.url)),
  plugins: [react()],
  test: {
    globals: true,
    pool: "threads",
    maxWorkers: 1,
    testTimeout: 10000,
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: [
            "tests/server/**/*.test.{js,mjs}",
            "tests/deployment/**/*.test.{js,mjs}",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          environment: "jsdom",
          include: [
            "tests/client/**/*.test.{js,jsx,mjs}",
            "tests/offline/**/*.test.{js,jsx,mjs}",
          ],
          setupFiles: ["tests/config/setup.js"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["server/**/*.js", "src/**/*.{js,jsx}", "public/sw.js"],
      exclude: ["src/main.jsx"],
      reporter: ["text", "json", "json-summary", "html"],
      reportsDirectory: "reports/coverage",
      thresholds: { statements: 95, branches: 85, functions: 100, lines: 95 },
    },
  },
});
