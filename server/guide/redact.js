// Strips the identifiers a person is most likely to type into a help question
// before the question leaves this server. Google holds prompts for a while
// for abuse monitoring even under paid terms, so anything we can keep out of
// them, we keep out. The person is told in the notice that this happens.
//
// Deliberately narrow: patterns that are almost never needed to answer a
// question about services and almost always identifying. Names are not
// attempted; false positives there would mangle program names.
const PATTERNS = [
  // Social Security numbers, with or without separators
  /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g,
  // Email addresses
  /[\w.+-]+@[\w-]+(\.[\w-]+)+/g,
  // North American phone numbers in common shapes
  /(\+?1[-. ]?)?\(?\b\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g,
  // Dates that look like a birth date
  /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g,
  // Any other long run of digits: case, benefit, card or account numbers
  /\b\d{7,}\b/g,
];

// Hotline numbers a person may legitimately ask about. Left in place so the
// question still makes sense to the model.
const KEEP = new Set(["211", "911", "988", "711"]);

function redactIdentifiers(question) {
  let out = question;
  for (const pattern of PATTERNS)
    out = out.replace(pattern, (match) =>
      KEEP.has(match) ? match : "[removed]",
    );
  return out;
}

module.exports = { redactIdentifiers };
