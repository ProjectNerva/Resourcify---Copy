// Checks that every guide topic still points at a live, on-topic 211 San Diego
// page. 211 moves pages, and several retired paths still return 200 while
// landing somewhere unrelated, so a status code alone proves nothing: this
// also requires the page title to match the topic and reports a content hash
// so a changed page shows up as a changed hash.
//
//   node scripts/guide/verify-211.mjs
//
// Read-only; no key needed. Re-run before each pilot, and after any change to
// server/guide/guide211.js. When a hash changes, re-read the page against the topic
// body by hand; the body must never claim more than the page does.
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { TOPICS } = require("../../server/guide/guide211.js");

let failures = 0;
for (const topic of TOPICS) {
  const expectWord = topic.title.split(/\s+/)[0].toLowerCase();
  try {
    const response = await fetch(topic.url, { redirect: "manual" });
    const html = response.status === 200 ? await response.text() : "";
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [
      ,
      "",
    ])[1].trim();
    const text = html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
    const hash = createHash("sha256").update(text).digest("hex").slice(0, 12);
    const problems = [];
    if (response.status !== 200) problems.push(`status ${response.status}`);
    if (!title.toLowerCase().includes(expectWord))
      problems.push(`title "${title}" lacks "${expectWord}"`);
    if (problems.length) failures += 1;
    console.log(
      `${problems.length ? "FAIL" : "ok  "} ${topic.id.padEnd(14)} ${hash}  ${title}${problems.length ? "  <- " + problems.join("; ") : ""}`,
    );
  } catch (e) {
    failures += 1;
    console.log(`FAIL ${topic.id.padEnd(14)} ${e.message}`);
  }
}
console.log(`\n${TOPICS.length - failures}/${TOPICS.length} topics verified`);
process.exitCode = failures ? 1 : 0;
