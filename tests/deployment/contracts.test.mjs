import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { precachePlugin } from "../../scripts/build/precache-plugin.mjs";
const read = (file) => fs.readFileSync(file, "utf8");
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );
}
describe("deployment and static contracts", () => {
  it("changes the service worker bytes whenever the built app changes", () => {
    const emitted = [],
      plugin = precachePlugin();
    const emit = (code) =>
      plugin.generateBundle.call(
        { emitFile: (item) => emitted.push(item) },
        {},
        { "assets/app.js": { code } },
      );
    emit("version one");
    emit("version two");
    const manifests = emitted
      .filter((x) => x.fileName === "precache-assets.json")
      .map((x) => JSON.parse(x.source));
    const workers = emitted.filter((x) => x.fileName === "sw.js");
    expect(workers).toHaveLength(2);
    workers.forEach((worker, i) =>
      expect(worker.source).toContain(
        `const BUILD_VERSION = "${manifests[i].version}";`,
      ),
    );
    expect(workers[0].source).not.toBe(workers[1].source);
  });
  it("hosts both app and API in one Render Node web service with no database or disk", () => {
    const blueprint = YAML.parse(read("render.yaml"));
    expect(blueprint.services).toHaveLength(1);
    const service = blueprint.services[0];
    expect(service).toMatchObject({
      type: "web",
      runtime: "node",
      startCommand: "npm start",
      healthCheckPath: "/api/health",
    });
    expect(service.buildCommand).toContain("npm ci --include=dev");
    expect(service.buildCommand).toContain("npm test");
    expect(service.buildCommand).toContain("npm run build");
    expect(service.disk).toBeUndefined();
    expect(blueprint.databases).toBeUndefined();
    expect(service.envVars.find((x) => x.key === "TRUST_PROXY").value).toBe(
      "1",
    );
  });
  it("has matching runtime metadata, reproducible scripts, no legacy provider dependency", () => {
    const pkg = JSON.parse(read("package.json")),
      lock = JSON.parse(read("package-lock.json"));
    expect(pkg.engines.node).toBe(lock.packages[""].engines.node);
    expect(pkg.scripts["heroku-postbuild"]).toBeUndefined();
    expect(pkg.dependencies.firebase).toBeUndefined();
    expect(pkg.dependencies["node-fetch"]).toBeUndefined();
    expect(read("scripts/build/build.mjs")).toMatch(
      /NODE_ENV = ['"]production['"]/,
    );
  });
  it("all advertised PWA icons exist with correct PNG dimensions; shortcuts resolve to implemented actions", () => {
    const manifest = JSON.parse(read("public/manifest.json"));
    for (const icon of manifest.icons) {
      const image = fs.readFileSync(path.join("public", icon.src));
      expect(`${image.readUInt32BE(16)}x${image.readUInt32BE(20)}`).toBe(
        icon.sizes,
      );
    }
    for (const shortcut of manifest.shortcuts)
      expect(["analyze", "budget"]).toContain(
        new URL(shortcut.url, "https://app.test").searchParams.get("action"),
      );
  });
  it("generates an offline manifest from every built chunk and updates its content hash", () => {
    const output = [],
      plugin = precachePlugin();
    const bundle = {
      "index.html": { source: "html" },
      "assets/a.js": { code: "first" },
      "assets/a.css": { source: "css" },
      "assets/a.js.map": { source: "private map" },
    };
    plugin.generateBundle.call(
      {
        emitFile: (item) => {
          if (item.fileName === "precache-assets.json")
            output.push(JSON.parse(item.source));
        },
      },
      {},
      bundle,
    );
    expect(output[0].files).toEqual([
      "/assets/a.css",
      "/assets/a.js",
      "/index.html",
    ]);
    bundle["assets/a.js"].code = "changed";
    plugin.generateBundle.call(
      {
        emitFile: (item) => {
          if (item.fileName === "precache-assets.json")
            output.push(JSON.parse(item.source));
        },
      },
      {},
      bundle,
    );
    expect(output[0].version).not.toBe(output[1].version);
  });
  it("has no conflict markers, retained-data writes, provider secrets or obsolete host calls in executable app sources", () => {
    const sources = [
      ...files("src").filter((f) => /\.(js|jsx)$/.test(f)),
      ...files("server"),
      "public/sw.js",
    ];
    for (const file of sources) {
      const text = read(file);
      expect(text, file).not.toMatch(/^(<<<<<<<|=======|>>>>>>>)/m);
      expect(text, file).not.toMatch(
        /herokuapp\.com|firebase\/|localStorage\.setItem|sessionStorage\.setItem|indexedDB\.open|addDoc\(/,
      );
      expect(text, file).not.toMatch(/AIza[0-9A-Za-z_-]{30,}/);
    }
  });
  it("privacy documents disclose providers and match removal of stored reports", () => {
    expect(read("public/privacy.html")).toContain("Render");
    expect(read("public/privacy.html")).toContain("Google");
    expect(read("public/privacy.html").replace(/\s+/g, " ")).toContain(
      "does not save photos",
    );
    expect(read("public/privacy.html").replace(/\s+/g, " ")).toContain(
      "Public community reporting and safe-location submissions are disabled",
    );
    for (const name of ["privacy", "terms", "offline", "404"])
      expect(read(`public/${name}.html`)).toContain('lang="en"');
  });
});
