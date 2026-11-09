import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { precachePlugin } from "./scripts/build/precache-plugin.mjs";

export default defineConfig({
  plugins: [react(), precachePlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: true } },
  },
  build: { outDir: "dist", sourcemap: false, manifest: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
