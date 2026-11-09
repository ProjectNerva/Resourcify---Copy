// Optional live check: sends only a generated, solid-color PNG. Never use a
// participant photo in this check. It may incur a small provider API charge.
import { createRequire } from "node:module";
import { deflateSync } from "node:zlib";
const require = createRequire(import.meta.url);
require("dotenv").config({ quiet: true });
const { createProviders } = require("../../server/providers.js");
const { normalizeAnalysis } = require("../../server/validation.js");
if (process.argv[2] !== "--live")
  throw new Error(
    "Use --live to explicitly send a synthetic test image to Google.",
  );
if (!process.env.GEMINI_API_KEY)
  throw new Error("GEMINI_API_KEY is not configured.");
function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  payload.copy(result, 4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
  return result;
}
const header = Buffer.alloc(13);
header.writeUInt32BE(128, 0);
header.writeUInt32BE(128, 4);
header[8] = 8;
header[9] = 6;
const pixels = Buffer.alloc(128 * 513, 240);
for (let row = 0; row < 128; row++) {
  pixels[row * 513] = 0;
  for (let col = 0; col < 128; col++) pixels[row * 513 + col * 4 + 4] = 255;
}
const image = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(pixels)),
  chunk("IEND", Buffer.alloc(0)),
]);
const providers = createProviders(
  {
    geminiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    timeout: 20000,
  },
  async (url, options) => {
    const response = await fetch(url, options);
    console.log(`Gemini HTTP status: ${response.status}`);
    return response;
  },
);
try {
  const result = normalizeAnalysis(
    await providers.analyze(image, "image/png", false),
    0,
  );
  console.log(
    `PASS: direct Gemini response passed schema validation (${result.items.length} detected items). Synthetic smoke test only; not an accuracy evaluation.`,
  );
} catch (error) {
  console.error(`${error.code || "FAILED"}: ${error.message}`);
  process.exitCode = 1;
}
