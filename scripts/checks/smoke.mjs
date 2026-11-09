const base = process.argv[2] || "http://localhost:3000";
const url = new URL(base);
if (!["http:", "https:"].includes(url.protocol))
  throw new Error("Use an HTTP or HTTPS base URL.");
for (const path of [
  "/api/health",
  "/api/capabilities",
  "/",
  "/privacy.html",
  "/terms.html",
  "/manifest.json",
  "/sw.js",
  "/precache-assets.json",
]) {
  const response = await fetch(new URL(path, url), {
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  if (
    path.startsWith("/api/") &&
    response.headers.get("cache-control") !== "no-store"
  )
    throw new Error(`${path}: missing no-store`);
  if (path === "/api/capabilities") {
    const data = await response.json();
    if (data.reports !== false || data.retention !== "none")
      throw new Error("Unexpected retention/reporting configuration");
    console.log("Capabilities:", JSON.stringify(data));
  }
  console.log(`PASS ${path}`);
}
