import { describe, expect, it } from "vitest";

import { isHtmlLocation, isPdfLocation, parseLocation } from "./location";

describe("parseLocation", () => {
  it("parses a pdf location (legacy: no per-segment bboxes)", () => {
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

  it("parses a pdf location with per-segment bboxes", () => {
    const input = {
      kind: "pdf",
      page: 2,
      charStart: 0,
      charEnd: 100,
      bbox: [5, 10, 70, 80],
      bboxes: [
        [10, 20, 30, 40],
        [50, 60, 70, 80],
      ],
    };

    const loc = parseLocation(input);

    if (loc.kind !== "pdf") throw new Error("expected pdf");
    expect(loc.bboxes).toEqual([
      [10, 20, 30, 40],
      [50, 60, 70, 80],
    ]);
  });

  it("parses an html location", () => {
    const input = {
      kind: "html",
      partIndex: 0,
      selector: "div > p:nth-of-type(1)",
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
});
