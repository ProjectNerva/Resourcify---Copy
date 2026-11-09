import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { TOPICS, CRISIS_RULES } = require("../../server/guide/guide211.js");

// Flesch-Kincaid grade, computed the same way the pre-pilot review did. The
// people this app is for read on phones, often in a hurry, sometimes in a
// second language; government plain-language guidance targets grade 7-8.
// Public pages and anything the guide quotes must not drift back to the
// college-level text they started at.
function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  let groups = (w.match(/[aeiouy]+/g) || []).length;
  if (w.endsWith("e") && !w.endsWith("le") && groups > 1) groups -= 1;
  return Math.max(1, groups);
}
export function fleschKincaidGrade(text) {
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.split(/\s+/).length > 2);
  const words = text.match(/[A-Za-z']+/g) || [];
  if (!sentences.length || !words.length) return 0;
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  return (
    0.39 * (words.length / sentences.length) +
    11.8 * (syl / words.length) -
    15.59
  );
}
const stripHtml = (html) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ");

const CEILING = 9;

describe("reading level", () => {
  it.each([["public/privacy.html"], ["public/terms.html"]])(
    "%s stays at or below grade %i",
    (file) => {
      const grade = fleschKincaidGrade(stripHtml(readFileSync(file, "utf8")));
      expect(
        grade,
        `${file} reads at grade ${grade.toFixed(1)}`,
      ).toBeLessThanOrEqual(CEILING);
    },
  );

  it("every guide topic the model quotes reads at or below the ceiling", () => {
    for (const topic of TOPICS) {
      const grade = fleschKincaidGrade(topic.body);
      expect(
        grade,
        `${topic.id} reads at grade ${grade.toFixed(1)}`,
      ).toBeLessThanOrEqual(CEILING);
    }
  });

  it("English crisis answers stay short and plain", () => {
    for (const rule of CRISIS_RULES.filter((r) => !r.lang || r.lang === "en")) {
      const grade = fleschKincaidGrade(rule.answer);
      expect(
        grade,
        `${rule.id} crisis answer reads at grade ${grade.toFixed(1)}`,
      ).toBeLessThanOrEqual(CEILING);
    }
  });
});
