const { badProvider, text } = require("../validation");

// "1,200." and "1200" are the same number to the leak check.
function plainNumber(n) {
  return n.replace(/,/g, "").replace(/[.:/-]+$/, "");
}
// The model chooses which corpus section it used; we resolve the link ourselves
// so a hallucinated URL can never reach the page.
function normalizeGuide(raw, topicById, allowedNumbers = new Set()) {
  if (!raw || typeof raw !== "object") throw badProvider();
  const lang = raw.lang === "es" ? "es" : "en";
  const topicId = typeof raw.topic === "string" ? raw.topic.trim() : "";
  // The model may only raise the crisis flag; the server supplies the words.
  if (topicId === "crisis") return { crisisBackstop: true, lang };
  const answer = text(raw.answer, 1200);
  const topic = topicById(topicId);
  // Any number the corpus does not contain is treated as invented. Dollar
  // figures, dates and limits are exactly what goes stale and does harm.
  const numbers = (answer.match(/\d[\d,.:/-]*\d|\d/g) || []).map(plainNumber);
  const leaked = numbers.filter((n) => !allowedNumbers.has(n));
  const grounded = Boolean(topic) && leaked.length === 0;
  return {
    answer: leaked.length ? "" : answer,
    sources: grounded ? [{ title: topic.title, url: topic.url }] : [],
    grounded,
    lang,
    leaked,
  };
}

module.exports = { normalizeGuide };
