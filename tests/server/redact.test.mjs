import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { redactIdentifiers } = require("../../server/guide/redact.js");

describe("identifier redaction", () => {
  it.each([
    ["my ssn is 123-45-6789", "123-45-6789"],
    ["ssn 123 45 6789 ok", "123 45 6789"],
    ["call me at 619-555-0123", "619-555-0123"],
    ["call me at (619) 555-0123", "(619) 555-0123"],
    ["or +1 619.555.0123", "619.555.0123"],
    ["email jane.doe+x@example.org please", "jane.doe+x@example.org"],
    ["born 03/14/1971", "03/14/1971"],
    ["case number 4471029385", "4471029385"],
  ])("removes %j", (input, secret) => {
    const out = redactIdentifiers(input);
    expect(out).not.toContain(secret);
    expect(out).toContain("[removed]");
  });

  it("leaves the hotline numbers people ask about", () => {
    expect(redactIdentifiers("is 211 free? what about 988 or 911?")).toBe(
      "is 211 free? what about 988 or 911?",
    );
  });

  it("leaves ordinary questions untouched", () => {
    const q = "I have 2 kids and make 1400 a month, can I get food help?";
    expect(redactIdentifiers(q)).toBe(q);
  });
});
