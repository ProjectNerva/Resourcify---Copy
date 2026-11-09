// Live evaluation of the guide against a fixed question set. Run it before a
// pilot and after any change to the corpus, the prompt or the model:
//
//   node scripts/guide/guide-eval.mjs --live
//
// It sends each question through the real route logic (crisis patterns,
// redaction, model, number check, backstop) and reports whether the outcome
// matched what the set expects. Nothing here is a unit test: it costs money,
// needs GEMINI_API_KEY, and the model is not deterministic. Treat a drop in
// the pass rate as a reason to look, not as proof of a bug.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("dotenv").config({ quiet: true });
const { createProviders } = require("../../server/providers.js");
const { normalizeGuide } = require("../../server/guide/answer.js");
const {
  topicById,
  allowedNumbers,
  crisisAnswer,
} = require("../../server/guide/guide211.js");
const { redactIdentifiers } = require("../../server/guide/redact.js");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.argv[2] !== "--live")
  throw new Error(
    "Use --live to send the question set to Google. It costs a little money.",
  );
if (!process.env.GEMINI_API_KEY)
  throw new Error("GEMINI_API_KEY is not configured.");

// --from N resumes at row N, for re-running a tail that hit a demand spike.
const fromArg = process.argv.indexOf("--from");
const from = fromArg === -1 ? 0 : Number(process.argv[fromArg + 1]) || 0;

const questions = JSON.parse(
  readFileSync(
    new URL("../../tests/eval/guide-questions.json", import.meta.url),
  ),
).slice(from);

// Google answers demand spikes with 503 for minutes at a time. An
// infrastructure error is not a model failure, so a question is retried a
// few times with a long pause before "error" is recorded for it.
async function withRetries(fn, attempts = 3, pauseMs = 25000) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (e.code !== "PROVIDER_BUSY" && e.status !== 502) throw e;
      if (i < attempts - 1) await sleep(pauseMs);
    }
  }
  throw lastError;
}
const providers = createProviders(
  {
    geminiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    timeout: 25000,
    retryDelay: 2000,
  },
  fetch,
);
const allowed = allowedNumbers();

let pass = 0;
const rows = [];
for (const item of questions) {
  let outcome,
    detail = "";
  const crisis = crisisAnswer(item.q);
  if (crisis) {
    outcome = "crisis";
    detail = `pattern:${crisis.id}/${crisis.lang}`;
  } else {
    try {
      const r = normalizeGuide(
        await withRetries(() => providers.guide(redactIdentifiers(item.q))),
        topicById,
        allowed,
      );
      if (r.crisisBackstop) {
        outcome = "crisis";
        detail = "model backstop";
      } else if (r.grounded) {
        outcome = "grounded";
        detail = `${r.sources[0]?.title} / ${r.lang}`;
      } else {
        outcome = r.leaked?.length ? "number_leak" : "decline";
        detail = r.leaked?.length ? `leaked ${r.leaked.join(",")}` : r.lang;
      }
      if (item.lang && r.lang && r.lang !== item.lang)
        detail += ` LANG MISMATCH (${r.lang})`;
    } catch (e) {
      outcome = "error";
      detail = `${e.status || ""} ${e.message}`;
    }
    await sleep(7000);
  }
  const ok =
    item.expect === outcome ||
    (item.expect === "decline_or_no_numbers" &&
      ["decline", "number_leak"].includes(outcome)) ||
    (item.expect === "decline_or_no_numbers" &&
      outcome === "grounded" &&
      !/\d/.test(detail)) ||
    (item.expect === "decline_or_no_eligibility" &&
      ["decline", "grounded"].includes(outcome));
  if (ok) pass += 1;
  rows.push(
    `${ok ? "PASS" : "FAIL"}  expect=${item.expect.padEnd(26)} got=${outcome.padEnd(11)} ${detail}\n      ${item.q}`,
  );
}
console.log(rows.join("\n"));
console.log(`\n${pass}/${questions.length} matched expectations`);
process.exitCode = pass === questions.length ? 0 : 1;
