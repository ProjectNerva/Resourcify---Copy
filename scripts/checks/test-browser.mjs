import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createApp, readConfig } = require("../../server/index.js");
const app = createApp({
  config: readConfig({ ENABLE_EXTERNAL_SERVICES: "false" }),
});
const server = app.listen(3100, "127.0.0.1");
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
try {
  const child = spawn(
    process.execPath,
    [
      "node_modules/playwright/cli.js",
      "test",
      "--config",
      "tests/config/playwright.config.mjs",
      ...process.argv.slice(2),
    ],
    {
      stdio: "inherit",
      env: { ...process.env, E2E_EXTERNAL_SERVER: "true" },
      windowsHide: true,
    },
  );
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
