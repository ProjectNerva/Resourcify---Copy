import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

// This file lives in tests/config/; the server and the reports are addressed from the
// repository root.
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  testDir: "../e2e",
  outputDir: "../../reports/e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 30000,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "../../reports/e2e-html" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: process.env.E2E_EXTERNAL_SERVER
    ? undefined
    : {
        command: "node server/index.js",
        cwd: repoRoot,
        url: "http://127.0.0.1:3100/api/health",
        env: {
          NODE_ENV: "production",
          PORT: "3100",
          ENABLE_EXTERNAL_SERVICES: "false",
        },
        reuseExistingServer: false,
        timeout: 30000,
      },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
