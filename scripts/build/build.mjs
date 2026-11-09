// Ensure a production bundle even when the calling shell sets NODE_ENV to dev.
process.env.NODE_ENV = "production";
const { build } = await import("vite");
await build();
