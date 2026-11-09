import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
export function precachePlugin() {
  return {
    name: "resourcify-static-precache",
    generateBundle(options, bundle) {
      const files = Object.keys(bundle)
        .filter((name) => !name.endsWith(".map") && !name.startsWith("."))
        .sort();
      const hash = createHash("sha256").update(
        files
          .map(
            (name) =>
              `${name}:${bundle[name].code ?? String(bundle[name].source)}`,
          )
          .join("\n"),
      );
      for (const file of [
        "index.html",
        "public/sw.js",
        "public/offline.html",
        "public/privacy.html",
        "public/terms.html",
        "public/policy.css",
        "public/404.html",
        "public/manifest.json",
        "public/icons/resourcify-192.png",
        "public/icons/resourcify-512.png",
      ])
        hash.update(readFileSync(file));
      const version = hash.digest("hex").slice(0, 16);
      this.emitFile({
        type: "asset",
        fileName: "precache-assets.json",
        source: JSON.stringify({
          version,
          files: files.map((name) => `/${name}`),
        }),
      });
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `const BUILD_VERSION = ${JSON.stringify(version)};\n${readFileSync("public/sw.js", "utf8")}`,
      });
    },
  };
}
