import { describe, expect, it } from "vitest";

import { isHtmlLocation, isPdfLocation, parseLocation } from "./location";

describe("parseLocation", () => {
  it("parses a pdf location", () => {
    const loc = parseLocation({
      kind: "pdf",
      page: 2,
      charStart: 0,
      charEnd: 100,
      bbox: [10, 20, 30, 40],
    });
    expect(loc.kind).toBe("pdf");
    expect(isPdfLocation(loc)).toBe(true);
    expect(isHtmlLocation(loc)).toBe(false);
  });

  it("parses an html location", () => {
    const loc = parseLocation({
      kind: "html",
      partIndex: 0,
      selector: "div > p:nth-of-type(1)",
      charStart: 0,
      charEnd: 50,
    });
    expect(loc.kind).toBe("html");
    expect(isHtmlLocation(loc)).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(() => parseLocation({ kind: "unknown" })).toThrow();
    expect(() => parseLocation({ kind: "pdf", page: -1 })).toThrow();
  });
});
