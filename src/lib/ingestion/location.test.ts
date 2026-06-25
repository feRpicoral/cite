import { describe, expect, it } from "vitest";

import { isHtmlLocation, isPdfLocation, parseLocation } from "./location";

describe("parseLocation", () => {
  it("parses a pdf location", () => {
    const input = {
      kind: "pdf",
      page: 2,
      charStart: 0,
      charEnd: 100,
      bbox: [10, 20, 30, 40],
    };

    const loc = parseLocation(input);

    expect(loc.kind).toBe("pdf");
    expect(isPdfLocation(loc)).toBe(true);
    expect(isHtmlLocation(loc)).toBe(false);
  });

  it("parses an html location", () => {
    const input = {
      kind: "html",
      partIndex: 0,
      selector: ":scope > p:nth-of-type(1)",
      charStart: 0,
      charEnd: 50,
    };

    const loc = parseLocation(input);

    expect(loc.kind).toBe("html");
    expect(isHtmlLocation(loc)).toBe(true);
  });

  it("rejects malformed input", () => {
    const parseUnknownKind = () => parseLocation({ kind: "unknown" });
    const parseNegativePage = () => parseLocation({ kind: "pdf", page: -1 });

    expect(parseUnknownKind).toThrow();
    expect(parseNegativePage).toThrow();
  });

  it("rejects an html selector outside the structural grammar", () => {
    const baseInput = { kind: "html" as const, partIndex: 0, charStart: 0, charEnd: 5 };

    const parseHostile = () => parseLocation({ ...baseInput, selector: "p:invalid((" });
    const parseArbitrary = () => parseLocation({ ...baseInput, selector: "img[onerror]" });

    expect(parseHostile).toThrow();
    expect(parseArbitrary).toThrow();
  });
});
