import { describe, expect, it } from "vitest";

import { chunkDocument, countTokens, unionLocation } from "./chunk";
import type { DocumentLocation } from "./location";
import type { NormalizedDocument, NormalizedPart, TextSegment } from "./parsers/types";

function htmlSeg(text: string, selector: string, partIndex: number = 0): TextSegment {
  return {
    text,
    location: { kind: "html", partIndex, selector, charStart: 0, charEnd: text.length },
  };
}

function makeDoc(parts: NormalizedPart[]): NormalizedDocument {
  return { format: "HTML", parts };
}

describe("chunkDocument", () => {
  it("returns no chunks for an empty document", () => {
    const doc = makeDoc([]);

    const chunks = chunkDocument(doc);

    expect(chunks).toEqual([]);
  });

  it("packs small segments into one chunk when under the target", () => {
    const part: NormalizedPart = {
      index: 0,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: [htmlSeg("Hello world.", "div > p:nth-of-type(1)")],
    };

    const chunks = chunkDocument(makeDoc([part]));

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe("Hello world.");
  });

  it("splits when a single part exceeds the max token budget", () => {
    const long = "Lorem ipsum dolor sit amet. ".repeat(80);
    const segs = Array.from({ length: 10 }, (_, i) =>
      htmlSeg(long, `div > p:nth-of-type(${i + 1})`),
    );
    const part: NormalizedPart = {
      index: 0,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: segs,
    };

    const chunks = chunkDocument(makeDoc([part]));

    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.tokenCount).toBeLessThanOrEqual(1500);
    }
  });

  it("assigns sequential ordinals across the whole document", () => {
    const p1: NormalizedPart = {
      index: 0,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: [htmlSeg("a", "div > p:nth-of-type(1)")],
    };
    const p2: NormalizedPart = {
      index: 1,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: [htmlSeg("b", "div > p:nth-of-type(1)")],
    };

    const chunks = chunkDocument(makeDoc([p1, p2]));

    expect(chunks.map((c) => c.index)).toEqual([0, 1]);
    expect(chunks[0]?.partIndex).toBe(0);
    expect(chunks[1]?.partIndex).toBe(1);
  });

  it("hard-splits a lone segment that exceeds the max token budget", () => {
    const huge = "word ".repeat(4000).trim();
    const selector = ":scope > p:nth-of-type(1)";
    const part: NormalizedPart = {
      index: 0,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: [htmlSeg(huge, selector)],
    };

    const chunks = chunkDocument(makeDoc([part]));

    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.tokenCount).toBeLessThanOrEqual(1500);
      expect(c.location.kind).toBe("html");
      if (c.location.kind === "html") {
        expect(c.location.selector).toBe(selector);
        expect(c.location.partIndex).toBe(0);
      }
    }
  });

  it("falls back to the first segment's location when a chunk spans distinct selectors", () => {
    const segs = [
      htmlSeg("one", ":scope > section:nth-of-type(1) > p:nth-of-type(1)"),
      htmlSeg("two", ":scope > section:nth-of-type(1) > p:nth-of-type(2)"),
    ];
    const part: NormalizedPart = {
      index: 0,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: segs,
    };

    const chunks = chunkDocument(makeDoc([part]));

    expect(chunks).toHaveLength(1);
    const loc = chunks[0]!.location;
    expect(loc.kind).toBe("html");
    if (loc.kind === "html") {
      expect(loc.selector).toBe(":scope > section:nth-of-type(1) > p:nth-of-type(1)");
      expect(loc.charStart).toBe(0);
      expect(loc.charEnd).toBe("one".length);
    }
  });

  it("unions offsets when every segment in a chunk shares one selector", () => {
    const selector = ":scope > p:nth-of-type(1)";
    const segs: TextSegment[] = [
      { text: "one", location: { kind: "html", partIndex: 0, selector, charStart: 0, charEnd: 3 } },
      {
        text: "two",
        location: { kind: "html", partIndex: 0, selector, charStart: 3, charEnd: 9 },
      },
    ];
    const part: NormalizedPart = {
      index: 0,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: segs,
    };

    const chunks = chunkDocument(makeDoc([part]));

    expect(chunks).toHaveLength(1);
    const loc = chunks[0]!.location;
    if (loc.kind !== "html") throw new Error("expected html");
    expect(loc.selector).toBe(selector);
    expect(loc.charStart).toBe(0);
    expect(loc.charEnd).toBe(9);
  });
});

describe("unionLocation", () => {
  it("merges PDF locations into a bounding bbox", () => {
    const locs: DocumentLocation[] = [
      { kind: "pdf", page: 3, charStart: 10, charEnd: 25, bbox: [10, 20, 50, 40] },
      { kind: "pdf", page: 3, charStart: 30, charEnd: 60, bbox: [5, 15, 60, 45] },
    ];

    const u = unionLocation(locs);

    expect(u).toEqual({
      kind: "pdf",
      page: 3,
      charStart: 10,
      charEnd: 60,
      bbox: [5, 15, 60, 45],
    });
  });

  it("unions HTML offsets when every location shares one selector", () => {
    const selector = ":scope > p:nth-of-type(1)";
    const locs: DocumentLocation[] = [
      { kind: "html", partIndex: 0, selector, charStart: 0, charEnd: 10 },
      { kind: "html", partIndex: 0, selector, charStart: 12, charEnd: 30 },
    ];

    const u = unionLocation(locs);

    if (u.kind !== "html") throw new Error("expected html");
    expect(u.selector).toBe(selector);
    expect(u.charStart).toBe(0);
    expect(u.charEnd).toBe(30);
  });

  it("falls back to the first HTML location when selectors differ", () => {
    const locs: DocumentLocation[] = [
      {
        kind: "html",
        partIndex: 0,
        selector: ":scope > p:nth-of-type(1)",
        charStart: 0,
        charEnd: 10,
      },
      {
        kind: "html",
        partIndex: 0,
        selector: ":scope > p:nth-of-type(2)",
        charStart: 0,
        charEnd: 20,
      },
    ];

    const u = unionLocation(locs);

    expect(u).toEqual(locs[0]);
  });
});

describe("countTokens", () => {
  it("returns a positive count for non-empty text", () => {
    const count = countTokens("hello world");

    expect(count).toBeGreaterThan(0);
  });

  it("returns 0 for empty text", () => {
    const count = countTokens("");

    expect(count).toBe(0);
  });
});
